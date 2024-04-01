const nodemailer = require("nodemailer");
const pug = require("pug");
const { convert } = require("html-to-text");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.nom = user.nom;
    this.url = url;
    this.from = `"univ" <${process.env.EMAIL_FROM}>`;
  }

  createTransport() {
    if (process.env.NODE_ENV == "production") {
      //Sendgrid
      return nodemailer.createTransport({
        // service: 'Gmail',     if we don"t use a known service we use host and port
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      // service: 'Gmail',     if we don"t use a known service we use host and port
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },

      //activate in Gmail 'less secure app' option
    });
  }

  //send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const htmlTemplate = pug.renderFile(
      `${__dirname}/../Views/email/${template}.pug`,
      {
        nom: this.nom,
        url: this.url,
        subject,
      }
    );

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: htmlTemplate,
      text: convert(htmlTemplate),
    };

    // 3) Create a transport and send email
    await this.createTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Univhub Family!");
  }
  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid for only 10 minutes)"
    );
  }
};
