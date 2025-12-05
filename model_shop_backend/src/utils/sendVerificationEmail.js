// utils/sendVerificationEmail.js
import 'dotenv/config';
import nodemailer from 'nodemailer';

const sendVerificationEmail = async (Email, Code) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',     
      auth: {
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS,   
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: Email,
      subject: 'Mã xác nhận đặt lại mật khẩu',
      text: `Mã xác nhận của bạn là: ${Code}\n\nMã này có hiệu lực trong 30 phút.\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
    
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #2c3e50;">Model Shop</h2>
          <p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>
          <h1 style="font-size: 42px; letter-spacing: 8px; background: #3498db; color: white; padding: 15px; border-radius: 8px; display: inline-block;">
            ${Code}
          </h1>
          <p><small>Hiệu lực trong <strong>30 phút</strong></small></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Đã gửi mã xác nhận đến: ${Email}`);
    return true;

  } catch (error) {
    console.log('Lỗi gửi email xác nhận:', error.message);
    return false;
  }
};

export default sendVerificationEmail;