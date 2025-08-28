import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME,      // اسم قاعدة البيانات
  process.env.DB_USER,      // اسم المستخدم
  process.env.DB_PASSWORD,   {
  host: DB_HOST,      // أو اسم السيرفر
  dialect: DB_DIALECT,
  dialectOptions: {
    options: {
      encrypt: true,      // إذا السيرفر يدعم التشفير
      trustServerCertificate: true, // إذا السيرفر local
    },
  },
});


export default sequelize;