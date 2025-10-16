
// ===== src/app/dashboard/page.js =====
"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const fetchFiles = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:4000/files?page=${page}&limit=10&search=${search}`, {
        withCredentials: true,
      });
      
      // ✅ هنا الإصلاح - نستخرج files من الاستجابة
      setFiles(res.data.files || []); // التأكد إن files موجودة
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error("خطأ في جلب الملفات:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الملف؟")) return;
    
    try {
      await axios.delete(`http://localhost:4000/files/${fileId}`, {
        withCredentials: true,
      });
      
      // إعادة جلب الملفات بعد الحذف
      fetchFiles(currentPage, searchTerm);
      alert("تم حذف الملف بنجاح");
    } catch (err) {
      console.error("خطأ في حذف الملف:", err);
      alert("فشل في حذف الملف");
    }
  };

  const renameFile = async (fileId, currentName) => {
    const newName = prompt("اسم الملف الجديد:", currentName);
    if (!newName || newName === currentName) return;

    try {
      await axios.put(`http://localhost:4000/files/${fileId}`, 
        { filename: newName },
        { withCredentials: true }
      );
      
      // إعادة جلب الملفات بعد التعديل
      fetchFiles(currentPage, searchTerm);
      alert("تم تعديل اسم الملف بنجاح");
    } catch (err) {
      console.error("خطأ في تعديل الملف:", err);
      alert("فشل في تعديل اسم الملف");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFiles(1, searchTerm);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchFiles(page, searchTerm);
  };

  const logout = async () => {
    try {
      await axios.post(
        "http://localhost:4000/logout",
        {},
        { withCredentials: true }
      );
      router.push("/login");
    } catch (err) {
      console.error("خطأ في تسجيل الخروج:", err);
      router.push("/login");
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  if (loading) {
    return <div>جارٍ تحميل الملفات...</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h1>📁 ملفاتي ({files.length})</h1>
        <div>
          <button 
            onClick={() => router.push("/upload")}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              marginRight: "10px",
              cursor: "pointer"
            }}
          >
            ⬆️ رفع ملف
          </button>
          <button 
            onClick={logout}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            🚪 خروج
          </button>
        </div>
      </div>

      {/* شريط البحث */}
      <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="ابحث في الملفات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "70%",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ddd",
            marginRight: "10px"
          }}
        />
        <button 
          type="submit"
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          🔍 بحث
        </button>
      </form>

      {/* قائمة الملفات */}
      {files.length === 0 ? (
        <p>لا توجد ملفات. <button onClick={() => router.push("/upload")}>ارفع ملفك الأول</button></p>
      ) : (
        <div>
          {files.map((file) => (
            <div 
              key={file.id} 
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "10px",
                backgroundColor: "#f9f9f9"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px 0" }}>📄 {file.filename}</h3>
                  <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                    📅 {new Date(file.createdAt).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                
                <div>
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: "#17a2b8",
                      color: "white",
                      padding: "5px 10px",
                      textDecoration: "none",
                      borderRadius: "3px",
                      marginRight: "5px",
                      fontSize: "12px"
                    }}
                  >
                    👁️ عرض
                  </a>
                  
                  <button 
                    onClick={() => renameFile(file.id, file.filename)}
                    style={{
                      backgroundColor: "#ffc107",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "3px",
                      marginRight: "5px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    ✏️ تعديل
                  </button>
                  
                  <button 
                    onClick={() => deleteFile(file.id)}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* الترقيم */}
      {pagination.total > 1 && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          {Array.from({ length: pagination.total }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              style={{
                margin: "0 5px",
                padding: "8px 12px",
                backgroundColor: page === currentPage ? "#007bff" : "#f8f9fa",
                color: page === currentPage ? "white" : "#333",
                border: "1px solid #dee2e6",
                borderRadius: "3px",
                cursor: "pointer"
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
