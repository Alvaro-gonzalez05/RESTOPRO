const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.zvibqglcslyqdvmvdjir:7L5e8ywHQpN5qtpF@aws-0-us-west-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkData() {
  try {
    console.log('🔍 Checking order_items data...');
    const orderItems = await pool.query('SELECT order_id, product_id, product_name, quantity, redeemed_quantity FROM order_items ORDER BY order_id DESC LIMIT 15');
    console.log('Order Items:');
    orderItems.rows.forEach(item => {
      console.log(`  Order ${item.order_id}: ${item.product_name} - Qty: ${item.quantity}, Redeemed: ${item.redeemed_quantity || 'NULL'}`);
    });
    
    console.log('\n🔍 Checking points_config...');
    const pointsConfig = await pool.query('SELECT product_id, redeem_points FROM points_config');
    console.log('Points Config:');
    pointsConfig.rows.forEach(config => {
      console.log(`  Product ${config.product_id}: ${config.redeem_points} points to redeem`);
    });
    
    console.log('\n🔍 Checking customers points...');
    const customers = await pool.query('SELECT id, name, points FROM customers ORDER BY id');
    console.log('Customers:');
    customers.rows.forEach(customer => {
      console.log(`  ${customer.name} (ID: ${customer.id}): ${customer.points || 0} points`);
    });
    
    console.log('\n🔍 Checking last 5 orders with their customer info...');
    const orders = await pool.query(`
      SELECT o.id, o.customer_name, o.customer_id, o.status, o.created_at
      FROM orders o 
      ORDER BY o.created_at DESC 
      LIMIT 5
    `);
    console.log('Recent Orders:');
    orders.rows.forEach(order => {
      console.log(`  Order ${order.id}: ${order.customer_name} (Customer ID: ${order.customer_id}) - Status: ${order.status}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
