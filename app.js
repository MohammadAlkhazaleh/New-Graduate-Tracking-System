// ---------------------- استدعاء المكتبات ----------------------
import express from "express";           // لإنشاء السيرفر
import bcrypt from "bcrypt";             // لتشفير كلمات المرور
import jwt from "jsonwebtoken";          // لإنشاء والتحقق من JWT
import dotenv from "dotenv";             // لتحميل متغيرات البيئة
import sequelize from "./db.js";         // اتصال قاعدة البيانات
import User from "./models/User.js";     // موديل User
import Graduate from "./models/Graduate.js";
import Admin from "./models/Admin.js";
import { where } from "sequelize";
import { Op } from "sequelize";


dotenv.config(); // تحميل متغيرات البيئة من ملف .env

// ---------------------- تهيئة السيرفر ----------------------
const app = express();
const port = 3000;

// middleware لتحويل JSON body إلى object
app.use(express.json());

// ---------------------- دالة التحقق من JWT ----------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]; // قراءة الهيدر
  const token = authHeader && authHeader.split(" ")[1]; // Authorization: Bearer <token>

  if (!token) return res.sendStatus(401); // إذا لا يوجد توكن

  // التحقق من صحة التوكن
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // توكن غير صالح
    req.user = user; // إضافة بيانات المستخدم للـ request
    next(); // السماح بالوصول للـ route
  });
};

// ---------------------- Route لتسجيل مستخدم جديد ----------------------


app.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, roleId, ...data } = req.body;
    const { email, phoneNumber, password } = data;

    // ✅ التحقق من الحقول المطلوبة
    if (!firstname?.trim() || !lastname?.trim()) 
      return res.status(400).send("First name and Last name are required!");
    
    if (!roleId || ![1,2].includes(roleId)) 
      return res.status(400).send("RoleId is required and must be 1 or 2!");
    
    if (!email && !phoneNumber) 
      return res.status(400).send("Email or Phone number is required!");
    
    if (!password) 
      return res.status(400).send("Password is required!");

    // ✅ البحث عن مستخدم موجود مسبقًا
    const conditions = [];
    if (email) conditions.push({ email });
    if (phoneNumber) conditions.push({ phoneNumber });

    if (conditions.length) {
      const findUser = await User.findOne({ where: { [Op.or]: conditions } });
      if (findUser) return res.status(400).send("User already exists!");
    }

    // ✅ تشفير كلمة المرور
   

    // ✅ إنشاء المستخدم
const newUser = await User.create({
  firstName: firstname,
  lastName: lastname,
  roleId: roleId,
  email,
  phoneNumber,
  password: password
});
    // ✅ إنشاء السجل المرتبط حسب الدور
    if (roleId === 2) {
  const requiredFields = ["batchNumber","institute","major","age","region","graduationDate","nationalId"];
      for (let field of requiredFields) {
        if (!data[field]) {
          return res.status(400).send(`${field} is required for Graduate!`);
        }
      }
      await Graduate.create({
  userId: newUser.userId,
  batchNumber: data.batchNumber,
  institute: data.institute,
  major: data.major,
  age: data.age,
  region: data.region,
  graduationDate: data.graduationDate,
  nationalId: data.nationalId,

});
    } else if (roleId === 1) {
       if (!data.department?.trim()) 
        return res.status(400).send("Department is required for Admin!");
     await Admin.create({ userId: newUser.userId, department: data.department });
    }

    console.log("New user registered:", email || phoneNumber);
    res.status(201).send("Registered successfully!");

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// ---------------------- Route لتسجيل الدخول ----------------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // البحث عن المستخدم
    const findUser = await User.findOne({ where: { email } });
    if (!findUser) return res.status(400).send("Wrong email or password!");

    // مقارنة كلمة المرور المدخلة مع المخزنة
    
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) return res.status(400).send("Wrong email or password!");

    // إنشاء JWT Token صالح لمدة ساعة
    const token = jwt.sign(
  { id: findUser.userId, email: findUser.email, role: findUser.roleId },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
  //this is ....
);

    res.status(200).json({
      message: "Logged in successfully!",
      token, // إرسال التوكن للمستخدم
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// ---------------------- Route محمي بمثال ----------------------
app.get("/profile", authenticateToken, (req, res) => {
  // فقط المستخدم الذي لديه JWT صالح يمكنه الوصول هنا
  res.json({ message: "Welcome to your profile!", user: req.user });
});

(async () => {
  try {
    await sequelize.authenticate(); // اختبار الاتصال بالـ DB
    console.log("✅ Database connected...");

    // إنشاء الجداول أو تعديلها فقط مرة واحدة
    await sequelize.sync({ alter: false }); 
    console.log("✅ All models synchronized");

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Unable to connect to the database:", err);
  }
})();
