import { PrismaClient, CategoryType, FraudRule, FraudSeverity, FraudStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting SpendGuard database seed...');

  // Clean existing data
  await prisma.fraudFlag.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Default Categories (userId = null)
  const defaultCategoriesData = [
    { name: 'Salary', type: CategoryType.INCOME },
    { name: 'Freelance', type: CategoryType.INCOME },
    { name: 'Food', type: CategoryType.EXPENSE },
    { name: 'Transport', type: CategoryType.EXPENSE },
    { name: 'Shopping', type: CategoryType.EXPENSE },
    { name: 'Bills', type: CategoryType.EXPENSE },
    { name: 'Entertainment', type: CategoryType.EXPENSE },
    { name: 'Health', type: CategoryType.EXPENSE },
  ];

  const categoriesMap: Record<string, string> = {};
  for (const cat of defaultCategoriesData) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        type: cat.type,
        userId: null,
      },
    });
    categoriesMap[cat.name] = created.id;
  }
  console.log('Created default categories.');

  // 2. Create Demo User
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@spendguard.com',
      passwordHash,
      name: 'Alex Morgan',
    },
  });
  console.log(`Created demo user: ${demoUser.email} (ID: ${demoUser.id})`);

  // 3. Generate 60+ Realistic Transactions over the past 90 days
  const now = new Date();
  const transactions: {
    userId: string;
    categoryId: string;
    amount: number;
    type: CategoryType;
    merchant: string;
    description: string;
    occurredAt: Date;
  }[] = [];

  // Monthly salaries (Month -2, Month -1, Current Month)
  for (let i = 2; i >= 0; i--) {
    const salaryDate = new Date(now.getFullYear(), now.getMonth() - i, 1, 9, 0, 0);
    transactions.push({
      userId: demoUser.id,
      categoryId: categoriesMap['Salary'],
      amount: 6000.0,
      type: CategoryType.INCOME,
      merchant: 'Acme Corp Payroll',
      description: 'Monthly Salary Direct Deposit',
      occurredAt: salaryDate,
    });
  }

  // Monthly Rent & Utility Bills
  for (let i = 2; i >= 0; i--) {
    const rentDate = new Date(now.getFullYear(), now.getMonth() - i, 3, 10, 0, 0);
    const utilDate = new Date(now.getFullYear(), now.getMonth() - i, 15, 14, 30, 0);

    transactions.push({
      userId: demoUser.id,
      categoryId: categoriesMap['Bills'],
      amount: 1800.0,
      type: CategoryType.EXPENSE,
      merchant: 'Skyline Apartments',
      description: 'Monthly Apartment Rent',
      occurredAt: rentDate,
    });

    transactions.push({
      userId: demoUser.id,
      categoryId: categoriesMap['Bills'],
      amount: 145.5,
      type: CategoryType.EXPENSE,
      merchant: 'City Power & Light',
      description: 'Electricity Bill',
      occurredAt: utilDate,
    });
  }

  // Generate ~50 daily normal expense transactions (Food, Transport, Shopping, Health, Entertainment)
  const merchants = {
    Food: ['Trader Joe\'s', 'Whole Foods', 'Starbucks', 'Chipotle', 'Uber Eats', 'Sweetgreen'],
    Transport: ['Uber', 'Lyft', 'Chevron Gas', 'Shell Station', 'Metro Pass'],
    Shopping: ['Amazon', 'Target', 'Nike', 'Apple Store', 'Zara'],
    Entertainment: ['Netflix', 'Spotify', 'AMC Theatres', 'Steam', 'Concert Tickets'],
    Health: ['CVS Pharmacy', 'Walgreens', 'Equinox Gym', 'Doctor Copay'],
  };

  for (let dayOffset = 85; dayOffset >= 2; dayOffset--) {
    // 1 to 2 transactions per day
    if (dayOffset % 2 === 0) {
      const txDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const catName = dayOffset % 5 === 0 ? 'Health' : dayOffset % 3 === 0 ? 'Transport' : 'Food';
      const mList = merchants[catName as keyof typeof merchants];
      const merchant = mList[dayOffset % mList.length];
      const amount = Math.floor(Math.random() * 80 + 15) + 0.99;

      transactions.push({
        userId: demoUser.id,
        categoryId: categoriesMap[catName],
        amount,
        type: CategoryType.EXPENSE,
        merchant,
        description: `Purchase at ${merchant}`,
        occurredAt: txDate,
      });
    }
  }

  // Insert base realistic transactions
  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        userId: tx.userId,
        categoryId: tx.categoryId,
        amount: tx.amount,
        type: tx.type,
        merchant: tx.merchant,
        description: tx.description,
        occurredAt: tx.occurredAt,
      },
    });
  }
  console.log(`Inserted ${transactions.length} base transactions.`);

  // 4. Create Fraud Triggering Transactions & Fraud Flags

  // Fraud Case 1: LARGE_AMOUNT ($7,500 at Luxury Watches Co)
  const largeAmountTx = await prisma.transaction.create({
    data: {
      userId: demoUser.id,
      categoryId: categoriesMap['Shopping'],
      amount: 7500.0,
      type: CategoryType.EXPENSE,
      merchant: 'Luxury Watches Co',
      description: 'High value watch purchase',
      occurredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  await prisma.fraudFlag.create({
    data: {
      transactionId: largeAmountTx.id,
      userId: demoUser.id,
      rule: FraudRule.LARGE_AMOUNT,
      severity: FraudSeverity.HIGH,
      reason: 'Transaction amount ($7,500.00) exceeds 3x 30-day expense average ($124.50) and exceeds $5,000 minimum threshold.',
      status: FraudStatus.OPEN,
    },
  });

  // Fraud Case 2: HIGH_VELOCITY (6 transactions within 5 minutes)
  const velocityBaseTime = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  for (let i = 0; i < 6; i++) {
    const velTx = await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        categoryId: categoriesMap['Food'],
        amount: 25.0 + i,
        type: CategoryType.EXPENSE,
        merchant: 'Corner Coffee Shop',
        description: `Rapid transaction #${i + 1}`,
        occurredAt: new Date(velocityBaseTime.getTime() + i * 60 * 1000), // 1 min apart
      },
    });

    if (i >= 5) {
      await prisma.fraudFlag.create({
        data: {
          transactionId: velTx.id,
          userId: demoUser.id,
          rule: FraudRule.HIGH_VELOCITY,
          severity: FraudSeverity.MEDIUM,
          reason: 'High transaction velocity: 6 transactions detected within a 10-minute window.',
          status: FraudStatus.OPEN,
        },
      });
    }
  }

  // Fraud Case 3: DUPLICATE (Same merchant & amount within 1 min)
  const dupTime1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const dupTime2 = new Date(dupTime1.getTime() + 30 * 1000); // 30 sec later

  await prisma.transaction.create({
    data: {
      userId: demoUser.id,
      categoryId: categoriesMap['Shopping'],
      amount: 89.99,
      type: CategoryType.EXPENSE,
      merchant: 'Target Store #102',
      description: 'Store purchase',
      occurredAt: dupTime1,
    },
  });

  const dupTx2 = await prisma.transaction.create({
    data: {
      userId: demoUser.id,
      categoryId: categoriesMap['Shopping'],
      amount: 89.99,
      type: CategoryType.EXPENSE,
      merchant: 'Target Store #102',
      description: 'Duplicate store purchase',
      occurredAt: dupTime2,
    },
  });

  await prisma.fraudFlag.create({
    data: {
      transactionId: dupTx2.id,
      userId: demoUser.id,
      rule: FraudRule.DUPLICATE,
      severity: FraudSeverity.LOW,
      reason: 'Potential duplicate transaction: Same merchant (Target Store #102) and amount ($89.99) within 2 minutes.',
      status: FraudStatus.OPEN,
    },
  });

  // Fraud Case 4: NEW_MERCHANT_HIGH_VALUE ($12,000 at Tech Empire Electronics)
  const newMerchantTx = await prisma.transaction.create({
    data: {
      userId: demoUser.id,
      categoryId: categoriesMap['Shopping'],
      amount: 12000.0,
      type: CategoryType.EXPENSE,
      merchant: 'Tech Empire Electronics',
      description: 'First purchase with merchant',
      occurredAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
  });

  await prisma.fraudFlag.create({
    data: {
      transactionId: newMerchantTx.id,
      userId: demoUser.id,
      rule: FraudRule.NEW_MERCHANT_HIGH_VALUE,
      severity: FraudSeverity.MEDIUM,
      reason: 'High-value first transaction with new merchant (Tech Empire Electronics) amounting to $12,000.00 (exceeds $10,000 threshold).',
      status: FraudStatus.OPEN,
    },
  });

  console.log('Seeded fraud triggering transactions and flags successfully.');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
