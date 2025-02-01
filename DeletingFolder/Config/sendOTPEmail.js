const nodemailer = require('nodemailer')


const sendEmailVerification = async (email,otp) => {
    try {
        console.log(email, otp)
     const transporter = nodemailer.createTransport({
      service:'gmail',
      port:587,
      secure:false,
      equireTLS:true,
      auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD,
    
      }
     
     })
     
  
                                                                              
     const info = await transporter.sendMail({
      from:process.env.NODEMAILER_EMAIL,
      to:email,
      subject:'Verify your account',
      text:`Your OTP is ${otp}`,
      html:`
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #333;">Your OTP Code</h2>
                <div style="border: 2px solid #4CAF50; padding: 10px; border-radius: 5px; display: inline-block;">
                    <h1 style="margin: 0; font-size: 24px; color: #4CAF50;">${otp}</h1>
                </div>
                <p style="margin-top: 10px;">Please enter this OTP to complete your registration.</p>
            </div>
        `,
      
    })

    return info.accepted.length>0;
     
  }catch (error) {
      console.error('Error to sending the email',error);
      return false;
  }
  }


  module.exports = sendEmailVerification