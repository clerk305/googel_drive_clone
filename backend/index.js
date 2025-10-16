const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const http = require("http");
const path = require("path");
require("dotenv").config();
const sharp = require("sharp");

const prisma = new PrismaClient();
const app = express();
const PORT = 4000;
const SECRET_KEY = "your_secret_key";
const server = http.createServer(app);

// إعداد Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// إعداد multer مع فلترة أنواع الملفات
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB حد أقصى
  },
  fileFilter: (req, file, cb) => {
    // السماح بجميع أنواع الملفات الآمنة
    const allowedTypes = [
      // الصور
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // المستندات
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // الأرشيف
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // الفيديو والصوت
      'video/mp4', 'video/avi', 'video/mov', 'audio/mp3', 'audio/wav', 'audio/mpeg',
      // البرمجة
      'text/html', 'text/css', 'text/javascript', 'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`), false);
    }
  }
});

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Middleware المصادقة
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "يجب تسجيل الدخول" });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: "رمز مميز غير صالح" });
    req.userId = decoded.userId;
    next();
  });
};

// وظيفة ضغط الملفات حسب النوع
const compressFile = async (filePath, mimetype, filename) => {
  try {
    // ضغط الصور
    if (mimetype.startsWith("image/")) {
      const compressedPath = `uploads/compressed-${filename}.webp`;
      await sharp(filePath)
        .resize({ width: 1920, height: 1080, fit: 'inside' })
        .webp({ quality: 80 })
        .toFile(compressedPath);
      return compressedPath;
    }
    
    // للملفات الأخرى، نعيد المسار الأصلي (يمكن إضافة ضغط لأنواع أخرى لاحقاً)
    return filePath;
  } catch (error) {
    console.error("خطأ في ضغط الملف:", error);
    return filePath; // في حالة الخطأ، نستخدم الملف الأصلي
  }
};

// حساب حجم الملف
const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
};

// تنظيف الملفات المؤقتة
const cleanupTempFiles = async (files) => {
  for (const file of files) {
    try {
      await fs.promises.unlink(file);
      console.log(`🧹 تم حذف الملف المؤقت: ${file}`);
    } catch (err) {
      console.warn(`⚠️ لم يتم حذف الملف المؤقت ${file}:`, err.message);
    }
  }
};


// إنشاء حساب
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "البريد الإلكتروني مستخدم مسبقًا" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    res.status(201).json({ message: "تم إنشاء الحساب بنجاح" });
  } catch (error) {
    console.error("خطأ في /signup:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء الحساب" });
  }
});

// تسجيل الدخول
app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
      return res.status(401).json({ error: "البريد الإلكتروني غير صحيح" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });

    const token = jwt.sign({ userId: user.id }, SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "تم تسجيل الدخول بنجاح" });
  } catch (error) {
    res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
  }
});

// تسجيل الخروج
app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
  });
  res.json({ message: "تم تسجيل الخروج بنجاح" });
});

// بيانات المستخدم
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true },
    });

    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "حدث خطأ أثناء جلب بيانات المستخدم" });
  }
});

// ✅ رفع الملفات المحسن
app.post("/upload", authMiddleware, upload.array("files", 20), async (req, res) => {
  const tempFiles = [];
  
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "لم يتم إرسال ملفات" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      tempFiles.push(file.path);
      
      console.log(`معالجة ملف: ${file.originalname} (${file.mimetype})`);
      
      // ضغط الملف حسب النوع
      const compressedPath = await compressFile(file.path, file.mimetype, file.filename);
      if (compressedPath !== file.path) {
        tempFiles.push(compressedPath);
      }

      // حساب الأحجام
      const originalSize = getFileSize(file.path);
      const compressedSize = getFileSize(compressedPath);
      
      console.log(`الحجم الأصلي: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`الحجم بعد الضغط: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);

      // رفع إلى Cloudinary
      const result = await cloudinary.uploader.upload(compressedPath, {
        folder: "drive",
        resource_type: "auto",
        quality: "auto:good",
      });

      // حفظ البيانات في قاعدة البيانات
      const uploadedFile = await prisma.file.create({
        data: {
          url: result.secure_url,
          filename: file.originalname,
          userId: req.userId,
        },
      });

      uploadedFiles.push({
        ...uploadedFile,
        originalSize: originalSize,
        compressedSize: compressedSize,
        compressionRatio: originalSize > 0 ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1) : 0
      });
    }

    // تنظيف الملفات المؤقتة
    cleanupTempFiles(tempFiles);

    res.json({ 
      message: "تم رفع الملفات بنجاح", 
      files: uploadedFiles,
      totalFiles: uploadedFiles.length
    });

  } catch (error) {
    console.error("خطأ في رفع الملفات:", error);
    
    // تنظيف الملفات المؤقتة في حالة الخطأ
    cleanupTempFiles(tempFiles);
    
    if (error.message.includes("نوع الملف غير مدعوم")) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: "حدث خطأ أثناء رفع الملفات" });
  }
});

// ✅ جلب ملفات المستخدم مع البحث والفلترة
app.get("/files", authMiddleware, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = {
      userId: req.userId,
      ...(search && {
        filename: {
          contains: search,
          mode: 'insensitive'
        }
      })
    };

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.file.count({ where: whereClause })
    ]);

    res.json({
      files,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalFiles: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: "حدث خطأ أثناء جلب الملفات" });
  }
});

// ✅ حذف ملف
app.delete("/files/:id", authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.id;

    // التحقق من ملكية الملف
    const file = await prisma.file.findFirst({
      where: { 
        id: fileId,
        userId: req.userId 
      }
    });

    if (!file) {
      return res.status(404).json({ error: "الملف غير موجود أو غير مسموح بحذفه" });
    }

    // استخراج public_id من الرابط
    const urlParts = file.url.split('/');
    const fileNameWithExt = urlParts[urlParts.length - 1];
    const publicId = `drive/${fileNameWithExt.split('.')[0]}`;

    // حذف من Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    } catch (cloudinaryError) {
      console.error("خطأ في حذف الملف من Cloudinary:", cloudinaryError);
      // نكمل العملية حتى لو فشل حذف الملف من Cloudinary
    }

    // حذف من قاعدة البيانات
    await prisma.file.delete({
      where: { id: fileId }
    });

    res.json({ message: "تم حذف الملف بنجاح" });

  } catch (error) {
    console.error("خطأ في حذف الملف:", error);
    res.status(500).json({ error: "حدث خطأ أثناء حذف الملف" });
  }
});

// ✅ تعديل اسم الملف
app.put("/files/:id", authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.id;
    const { filename } = req.body;

    if (!filename || filename.trim() === '') {
      return res.status(400).json({ error: "اسم الملف مطلوب" });
    }

    // التحقق من ملكية الملف
    const existingFile = await prisma.file.findFirst({
      where: { 
        id: fileId,
        userId: req.userId 
      }
    });

    if (!existingFile) {
      return res.status(404).json({ error: "الملف غير موجود أو غير مسموح بتعديله" });
    }

    // تحديث اسم الملف
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: { filename: filename.trim() }
    });

    res.json({ 
      message: "تم تعديل اسم الملف بنجاح", 
      file: updatedFile 
    });

  } catch (error) {
    console.error("خطأ في تعديل الملف:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تعديل الملف" });
  }
});

// ✅ استبدال ملف
app.put("/files/:id/replace", authMiddleware, upload.single("file"), async (req, res) => {
  const tempFiles = [];
  
  try {
    const fileId = req.params.id;
    const newFile = req.file;

    if (!newFile) {
      return res.status(400).json({ error: "يجب إرسال ملف جديد" });
    }

    tempFiles.push(newFile.path);

    // التحقق من ملكية الملف الأصلي
    const existingFile = await prisma.file.findFirst({
      where: { 
        id: fileId,
        userId: req.userId 
      }
    });

    if (!existingFile) {
      cleanupTempFiles(tempFiles);
      return res.status(404).json({ error: "الملف غير موجود أو غير مسموح بتعديله" });
    }

    console.log(`استبدال ملف: ${existingFile.filename} بـ ${newFile.originalname}`);

    // ضغط الملف الجديد
    const compressedPath = await compressFile(newFile.path, newFile.mimetype, newFile.filename);
    if (compressedPath !== newFile.path) {
      tempFiles.push(compressedPath);
    }

    // رفع الملف الجديد إلى Cloudinary
    const result = await cloudinary.uploader.upload(compressedPath, {
      folder: "drive",
      resource_type: "auto",
      quality: "auto:good",
    });

    // حذف الملف القديم من Cloudinary
    try {
      const urlParts = existingFile.url.split('/');
      const fileNameWithExt = urlParts[urlParts.length - 1];
      const publicId = `drive/${fileNameWithExt.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    } catch (cloudinaryError) {
      console.error("خطأ في حذف الملف القديم من Cloudinary:", cloudinaryError);
    }

    // تحديث البيانات في قاعدة البيانات
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        url: result.secure_url,
        filename: newFile.originalname,
      }
    });

    // تنظيف الملفات المؤقتة
    cleanupTempFiles(tempFiles);

    const originalSize = getFileSize(newFile.path);
    const compressedSize = getFileSize(compressedPath);

    res.json({ 
      message: "تم استبدال الملف بنجاح", 
      file: {
        ...updatedFile,
        originalSize: originalSize,
        compressedSize: compressedSize,
        compressionRatio: originalSize > 0 ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error("خطأ في استبدال الملف:", error);
    
    // تنظيف الملفات المؤقتة في حالة الخطأ
    cleanupTempFiles(tempFiles);
    
    if (error.message.includes("نوع الملف غير مدعوم")) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: "حدث خطأ أثناء استبدال الملف" });
  }
});

// ✅ إحصائيات المستخدم
app.get("/stats", authMiddleware, async (req, res) => {
  try {
    const stats = await prisma.file.groupBy({
      by: ['userId'],
      where: { userId: req.userId },
      _count: {
        id: true
      }
    });

    const totalFiles = stats.length > 0 ? stats[0]._count.id : 0;

    res.json({
      totalFiles,
      storageUsed: "غير متاح حالياً", // يمكن حسابه لاحقاً
      lastUpload: await prisma.file.findFirst({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    });
  } catch (error) {
    res.status(500).json({ error: "حدث خطأ أثناء جلب الإحصائيات" });
  }
});

// تشغيل السيرفر
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 File upload system ready with compression support`);
});

// إنشاء مجلد uploads إذا لم يكن موجود
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
//npx prisma studio
//npx prisma migrate deploy
//npx prisma generate
//npx prisma migrate
//npx prisma migrate reset
//npx prisma migrate dev --name init

//npm cache clean --force
//npx prisma format
//1 npm init -y
//2 npm install prisma --save-dev
//3 npm install @prisma/client
//4 npm install express  bcryptjs cors dotenv socket.io  cookie-parser jsonwebtoken
//5 npx prisma init
 