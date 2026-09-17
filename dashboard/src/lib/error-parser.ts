export function parseErrorMessage(rawError?: string | null): {
  summary: string;
  suggestion?: string;
  technicalDetails?: string;
  raw: string;
} {
  if (!rawError) return { summary: 'Không có thông tin lỗi', raw: '' };

  // Loại bỏ mã màu ANSI và escape sequences (ví dụ: [2m, [22m, \u001b[...m)
  const clean = String(rawError)
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\[\d+m/g, '')
    .trim();

  let mainError = clean;
  let technicalDetails = '';

  // Tách Call log hoặc stack trace nếu có
  if (clean.includes('Call log:')) {
    const parts = clean.split('Call log:');
    mainError = parts[0].trim();
    technicalDetails = 'Call log:\n' + parts.slice(1).join('Call log:').trim();
  } else if (clean.includes('=========================== logs ===========================')) {
    const parts = clean.split('=========================== logs ===========================');
    mainError = parts[0].trim();
    technicalDetails = parts.slice(1).join('').trim();
  } else if (clean.includes('\n')) {
    const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
    mainError = lines[0] || clean;
    if (lines.length > 1) {
      technicalDetails = lines.slice(1).join('\n');
    }
  }

  let summary = mainError;
  let suggestion = '';

  if (/timeout.*exceeded/i.test(mainError)) {
    summary = 'Hết thời gian chờ (Timeout 30s): Facebook phản hồi chậm hoặc không tìm thấy nút bấm tương tác.';
    suggestion = 'Vui lòng kiểm tra lại đường truyền mạng hoặc bấm nút "Mở Chrome Profile" của tài khoản để kiểm tra giao diện Facebook.';
  } else if (/Target page, context or browser has been closed/i.test(mainError)) {
    summary = 'Cửa sổ Chrome bị đóng đột ngột trong khi đang thực hiện tác vụ.';
    suggestion = 'Đảm bảo không tắt thủ công cửa sổ Chrome tự động và không có tiến trình nào can thiệp kill Chrome.';
  } else if (/chưa tham gia nhóm|phê duyệt/i.test(mainError)) {
    summary = 'Tài khoản chưa tham gia nhóm này hoặc nhóm đang yêu cầu Quản trị viên duyệt thành viên.';
    suggestion = 'Bấm "Mở Chrome Profile" của tài khoản, truy cập nhóm và ấn Tham gia / trả lời câu hỏi của quản trị viên trước.';
  } else if (/Rate limit|Quota Exceeded|giới hạn/i.test(mainError)) {
    summary = 'Tài khoản ChatGPT đã đạt giới hạn quota tạo ảnh hoặc bị rate limit.';
    suggestion = 'Bật cả 2 tài khoản ChatGPT trên Dashboard để tự động luân phiên hoặc chờ qua khung giờ giới hạn.';
  } else if (/Chrome is not ready|chưa đăng nhập|net::ERR_CONNECTION_REFUSED/i.test(mainError)) {
    summary = 'Không thể kết nối đến Chrome Profile (Cổng bị ngắt kết nối hoặc chưa đăng nhập).';
    suggestion = 'Kiểm tra trạng thái server, khởi động lại hệ thống hoặc mở Chrome Profile để đăng nhập lại tài khoản.';
  } else if (/không tìm thấy ô upload|không tìm thấy ô đăng bài/i.test(mainError)) {
    summary = 'Không tìm thấy khung soạn thảo hoặc nút đính kèm ảnh trên Facebook.';
    suggestion = 'Giao diện trang Facebook có thể đã đổi sang mẫu mới. Thử mở Chrome Profile để xem trạng thái trang.';
  }

  return { summary, suggestion, technicalDetails, raw: clean };
}
