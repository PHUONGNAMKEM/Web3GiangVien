const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const indexes = await db.collection('lophocs').indexes();
  console.log(JSON.stringify(indexes, null, 2));
  process.exit(0);
}).catch(console.error);
