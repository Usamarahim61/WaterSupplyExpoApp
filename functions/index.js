const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.generateMonthlyBills = functions.pubsub.schedule('0 0 1 * *').timeZone('Asia/Karachi').onRun(async (context) => {
  try {
    const db = admin.firestore();

    // Get settings
    const settingsSnapshot = await db.collection('settings').limit(1).get();
    if (settingsSnapshot.empty) {
      console.log('No settings found');
      return null;
    }

    const settings = settingsSnapshot.docs[0].data();
    if (!settings.autoBillGeneration) {
      console.log('Auto bill generation is disabled');
      return null;
    }

    const fixedPrice = settings.fixedPrice || 1000;

    // Get all customers
    const customersSnapshot = await db.collection('customers').get();
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get current month bills
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const billsSnapshot = await db.collection('bills')
      .where('billDate', '>=', new Date(currentYear, currentMonth, 1))
      .where('billDate', '<', new Date(currentYear, currentMonth + 1, 1))
      .get();

    const existingBills = billsSnapshot.docs.map(doc => doc.data());

    // Find customers without bills
    const customersWithoutBills = customers.filter(customer => {
      return !existingBills.some(bill => bill.customerId === customer.id);
    });

    // Generate bills
    const batch = db.batch();
    customersWithoutBills.forEach(customer => {
      const billRef = db.collection('bills').doc();
      batch.set(billRef, {
        customerId: customer.id,
        amount: fixedPrice,
        status: 'pending',
        billDate: admin.firestore.Timestamp.fromDate(new Date()),
        paymentDate: null,
        notes: `Auto-generated monthly bill for ${new Date().toLocaleDateString()}`
      });
    });

    await batch.commit();

    console.log(`Generated ${customersWithoutBills.length} bills`);
    return null;
  } catch (error) {
    console.error('Error generating monthly bills:', error);
    return null;
  }
});
