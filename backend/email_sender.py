import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional
import os

class EmailSender:
    """Send email with department reports as attachments"""
    
    def __init__(self, smtp_server: str = 'smtp.gmail.com', 
                 smtp_port: int = 587,
                 use_tls: bool = True):
        """
        Initialize email sender
        
        Args:
            smtp_server: SMTP server address
            smtp_port: SMTP server port
            use_tls: Whether to use TLS encryption
        """
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.use_tls = use_tls
    
    def send_department_report(self, 
                              recipient_email: str,
                              department_name: str,
                              report_file_path: str,
                              sender_email: str,
                              sender_password: str,
                              subject: Optional[str] = None,
                              body: Optional[str] = None) -> bool:
        """
        Send department report via email
        
        Args:
            recipient_email: Email address of recipient
            department_name: Name of the department
            report_file_path: Path to Excel report file
            sender_email: Email address to send from
            sender_password: Password for sender email
            subject: Optional custom subject line
            body: Optional custom email body
        
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = recipient_email
            msg['Subject'] = subject or f'דוח עלויות מחלקה: {department_name}'
            
            # Email body
            email_body = body or f"""
שלום,

בצירוף הדוח עלויות המחלקה עבור {department_name}.

הדוח מכיל פירוט נסיעות ועלויות המוקצות למחלקה.

בברכה,
מערכת השוואת נסיעות
"""
            msg.attach(MIMEText(email_body, 'plain', 'utf-8'))
            
            # Attach file
            if os.path.exists(report_file_path):
                with open(report_file_path, 'rb') as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                
                encoders.encode_base64(part)
                filename = os.path.basename(report_file_path)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {filename}'
                )
                msg.attach(part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)
            
            return True
        
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False
    
    def send_multiple_reports(self,
                             recipients: list,  # List of {'email': str, 'department': str, 'file_path': str}
                             sender_email: str,
                             sender_password: str) -> dict:
        """
        Send multiple department reports
        
        Args:
            recipients: List of recipient dicts with email, department, and file_path
            sender_email: Email address to send from
            sender_password: Password for sender email
        
        Returns:
            Dict with results for each recipient
        """
        results = {}
        for recipient in recipients:
            success = self.send_department_report(
                recipient_email=recipient['email'],
                department_name=recipient['department'],
                report_file_path=recipient['file_path'],
                sender_email=sender_email,
                sender_password=sender_password
            )
            results[recipient['email']] = {
                'success': success,
                'department': recipient['department']
            }
        
        return results

