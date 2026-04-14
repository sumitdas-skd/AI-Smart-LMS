import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

class EmailService:
    @staticmethod
    def send_reset_password_email(to_email: str, reset_token: str):
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{reset_token}"
        
        # Dev mode printing
        if settings.APP_ENV == "development":
            print(f"\n==========================================")
            print(f"DEV EMAIL MOCK: Password Reset")
            print(f"To: {to_email}")
            print(f"Link: {reset_link}")
            print(f"==========================================\n")
            return True

        if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASS:
            print("Warning: SMTP credentials not set, cannot send email.")
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USER
            msg['To'] = to_email
            msg['Subject'] = "Password Reset Request"
            
            body = f"Click the link to reset your password: {reset_link}\nThis link expires in 1 hour."
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
