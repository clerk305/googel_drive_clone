
// ===== src/app/upload/page.js =====
"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const router = useRouter();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      alert("يرجى اختيار ملف واحد على الأقل");
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append("files", file);
    });

    try {
      setUploading(true);
      const response = await axios.post("http://localhost:4000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ overall: progress });
        }
      });

      alert(`تم رفع ${response.data.totalFiles} ملف بنجاح`);
      router.push("/dashboard");
    } catch (err) {
      console.error("خطأ في رفع الملفات:", err);
      if (err.response?.data?.error) {
        alert(`فشل رفع الملفات: ${err.response.data.error}`);
      } else {
        alert("فشل رفع الملفات. تحقق من الاتصال وحجم الملفات.");
      }
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('zip') || file.type.includes('rar')) return '📦';
    if (file.type.includes('word')) return '📝';
    if (file.type.includes('excel') || file.type.includes('sheet')) return '📊';
    return '📎';
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h1>⬆️ رفع ملفات</h1>
        <button 
          onClick={() => router.push("/dashboard")}
          style={{
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          ← العودة
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input 
          type="file" 
          multiple 
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.html,.css,.js,.json"
          style={{
            width: "100%",
            padding: "15px",
            border: "2px dashed #007bff",
            borderRadius: "8px",
            backgroundColor: "#f8f9ff",
            cursor: "pointer"
          }}
        />
        <p style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
          يمكن رفع: صور، فيديوهات، مستندات، أرشيف، ملفات برمجة<br/>
          الحد الأقصى: 50 MB لكل ملف | حتى 20 ملف في المرة الواحدة
        </p>
      </div>

      {/* عرض الملفات المختارة */}
      {selectedFiles.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3>الملفات المختارة ({selectedFiles.length}):</h3>
          {selectedFiles.map((file, index) => (
            <div 
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "5px",
                marginBottom: "5px",
                backgroundColor: "#f9f9f9"
              }}
            >
              <div>
                <span style={{ fontSize: "20px", marginRight: "10px" }}>
                  {getFileType(file)}
                </span>
                <span style={{ fontWeight: "bold" }}>{file.name}</span>
                <span style={{ color: "#666", marginLeft: "10px" }}>
                  ({formatFileSize(file.size)})
                </span>
              </div>
              <button 
                onClick={() => removeFile(index)}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                ❌
              </button>
            </div>
          ))}
        </div>
      )}

      {/* شريط التقدم */}
      {uploading && uploadProgress.overall !== undefined && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ 
            width: "100%", 
            backgroundColor: "#e9ecef", 
            borderRadius: "10px",
            height: "20px"
          }}>
            <div 
              style={{
                width: `${uploadProgress.overall}%`,
                backgroundColor: "#007bff",
                height: "100%",
                borderRadius: "10px",
                textAlign: "center",
                color: "white",
                lineHeight: "20px",
                fontSize: "12px"
              }}
            >
              {uploadProgress.overall}%
            </div>
          </div>
          <p style={{ textAlign: "center", marginTop: "5px" }}>جارٍ الرفع...</p>
        </div>
      )}

      <button 
        onClick={uploadFiles} 
        disabled={selectedFiles.length === 0 || uploading}
        style={{
          width: "100%",
          padding: "15px",
          fontSize: "16px",
          fontWeight: "bold",
          backgroundColor: uploading ? "#6c757d" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: uploading ? "not-allowed" : "pointer"
        }}
      >
        {uploading ? "جارٍ الرفع..." : `🚀 رفع ${selectedFiles.length} ملف`}
      </button>
    </div>
  );
}
