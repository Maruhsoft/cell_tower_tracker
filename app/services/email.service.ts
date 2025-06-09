import { Observable } from '@nativescript/core';
import { CellTowerInfo } from './cell-tower.service';
import { Http } from '@nativescript/core';
import { EmailConfig } from './email-config';

export class EmailService extends Observable {
  
  public async sendCellTowerChangeAlert(newCellData: CellTowerInfo, previousCellData: CellTowerInfo | null): Promise<boolean> {
    try {
      const subject = `🚨 CELL TOWER CHANGE ALERT - ${new Date().toLocaleString()}`;
      const body = this.formatCellTowerChangeAlert(newCellData, previousCellData);
      
      const response = await this.sendEmailViaAPI(subject, body, 'ALERT');
      return response;
    } catch (error) {
      console.error('Error sending cell tower change alert:', error);
      return false;
    }
  }

  public async sendPeriodicUpdate(cellData: CellTowerInfo, scanCount: number): Promise<boolean> {
    try {
      const subject = `📍 Periodic Location Update #${Math.floor(scanCount / 10)} - ${new Date().toLocaleString()}`;
      const body = this.formatPeriodicUpdate(cellData, scanCount);
      
      const response = await this.sendEmailViaAPI(subject, body, 'UPDATE');
      return response;
    } catch (error) {
      console.error('Error sending periodic update:', error);
      return false;
    }
  }

  public async sendManualReport(cellData: CellTowerInfo): Promise<boolean> {
    try {
      const subject = `📱 Manual Cell Tower Report - ${new Date().toLocaleString()}`;
      const body = this.formatManualReport(cellData);
      
      const response = await this.sendEmailViaAPI(subject, body, 'MANUAL');
      return response;
    } catch (error) {
      console.error('Error sending manual report:', error);
      return false;
    }
  }

  private formatCellTowerChangeAlert(newCellData: CellTowerInfo, previousCellData: CellTowerInfo | null): string {
    let changeDetails = '';
    
    if (previousCellData) {
      const changes = [];
      if (previousCellData.mcc !== newCellData.mcc) changes.push(`MCC: ${previousCellData.mcc} → ${newCellData.mcc}`);
      if (previousCellData.mnc !== newCellData.mnc) changes.push(`MNC: ${previousCellData.mnc} → ${newCellData.mnc}`);
      if (previousCellData.lac !== newCellData.lac) changes.push(`LAC: ${previousCellData.lac} → ${newCellData.lac}`);
      if (previousCellData.cid !== newCellData.cid) changes.push(`CID: ${previousCellData.cid} → ${newCellData.cid}`);
      if (previousCellData.carrierName !== newCellData.carrierName) changes.push(`Carrier: ${previousCellData.carrierName} → ${newCellData.carrierName}`);
      
      changeDetails = `
DETECTED CHANGES:
${changes.map(change => `- ${change}`).join('\n')}

PREVIOUS LOCATION:
- MCC: ${previousCellData.mcc}
- MNC: ${previousCellData.mnc}
- LAC: ${previousCellData.lac}
- CID: ${previousCellData.cid}
- Carrier: ${previousCellData.carrierName}
`;
    }

    return `
🚨 CELL TOWER CHANGE DETECTED 🚨
===============================

ALERT: Device has moved to a different cell tower!
Timestamp: ${new Date().toISOString()}
${changeDetails}
CURRENT LOCATION:
- Mobile Country Code (MCC): ${newCellData.mcc}
- Mobile Network Code (MNC): ${newCellData.mnc}
- Location Area Code (LAC): ${newCellData.lac}
- Cell ID (CID): ${newCellData.cid}

CURRENT SIGNAL INFORMATION:
- Signal Strength: ${newCellData.signalStrength}%
- RSSI: ${newCellData.rssi} dBm
- Network Type: ${newCellData.networkType}

CURRENT CARRIER INFORMATION:
- Carrier Name: ${newCellData.carrierName}
- Country Code: ${newCellData.countryCode}

DEVICE INFORMATION:
- Platform: Android
- Alert Time: ${new Date().toLocaleString()}

---
⚠️ This is an automated alert from Cell Tower Tracker (Stealth Mode)
Device location has changed - immediate notification sent.
    `.trim();
  }

  private formatPeriodicUpdate(cellData: CellTowerInfo, scanCount: number): string {
    return `
📍 PERIODIC LOCATION UPDATE
==========================

Update #${Math.floor(scanCount / 10)} - Timestamp: ${new Date().toISOString()}
Total Scans Completed: ${scanCount}

CURRENT LOCATION:
- Mobile Country Code (MCC): ${cellData.mcc}
- Mobile Network Code (MNC): ${cellData.mnc}
- Location Area Code (LAC): ${cellData.lac}
- Cell ID (CID): ${cellData.cid}

SIGNAL INFORMATION:
- Signal Strength: ${cellData.signalStrength}%
- RSSI: ${cellData.rssi} dBm
- Network Type: ${cellData.networkType}

CARRIER INFORMATION:
- Carrier Name: ${cellData.carrierName}
- Country Code: ${cellData.countryCode}

STATUS:
- Stealth Mode: ACTIVE
- Monitoring Interval: 2 minutes
- Last Update: ${new Date().toLocaleString()}

---
📊 This is a periodic update from Cell Tower Tracker (Stealth Mode)
No location changes detected in the last 20 minutes.
    `.trim();
  }

  private formatManualReport(cellData: CellTowerInfo): string {
    return `
📱 MANUAL CELL TOWER REPORT
===========================

Manual Report Generated: ${new Date().toISOString()}

CURRENT LOCATION:
- Mobile Country Code (MCC): ${cellData.mcc}
- Mobile Network Code (MNC): ${cellData.mnc}
- Location Area Code (LAC): ${cellData.lac}
- Cell ID (CID): ${cellData.cid}

SIGNAL INFORMATION:
- Signal Strength: ${cellData.signalStrength}%
- RSSI: ${cellData.rssi} dBm
- Network Type: ${cellData.networkType}

CARRIER INFORMATION:
- Carrier Name: ${cellData.carrierName}
- Country Code: ${cellData.countryCode}

DEVICE INFORMATION:
- Platform: Android
- Report Time: ${new Date().toLocaleString()}
- Report Type: Manual Request

---
🔍 This report was manually requested from Cell Tower Tracker
User initiated scan and email report.
    `.trim();
  }

  private async sendEmailViaAPI(subject: string, body: string, type: string): Promise<boolean> {
    try {
      // Method 1: Try using EmailJS (free email service)
      const emailJSResult = await this.sendViaEmailJS(subject, body, type);
      if (emailJSResult) {
        return true;
      }

      // Method 2: Try using a webhook service like Formspree
      const formspreeResult = await this.sendViaFormspree(subject, body, type);
      if (formspreeResult) {
        return true;
      }

      // Method 3: Try using a simple SMTP service
      const smtpResult = await this.sendViaSMTP(subject, body, type);
      if (smtpResult) {
        return true;
      }

      // If all methods fail, log for debugging
      console.log(`=== ${type} EMAIL FAILED TO SEND ===`);
      console.log('To: maruhsoft@gmail.com');
      console.log('Subject:', subject);
      console.log('Body:', body);
      console.log('================================');
      
      return false;
    } catch (error) {
      console.error('Email API error:', error);
      return false;
    }
  }

  private async sendViaEmailJS(subject: string, body: string, type: string): Promise<boolean> {
    try {
      // Check if EmailJS is configured
      if (EmailConfig.emailJS.serviceID === 'service_your_id' || 
          EmailConfig.emailJS.templateID === 'template_your_id' || 
          EmailConfig.emailJS.userID === 'your_user_id') {
        console.log('EmailJS not configured - skipping');
        return false;
      }

      const emailData = {
        service_id: EmailConfig.emailJS.serviceID,
        template_id: EmailConfig.emailJS.templateID,
        user_id: EmailConfig.emailJS.userID,
        template_params: {
          to_email: 'maruhsoft@gmail.com',
          subject: subject,
          message: body,
          type: type,
          timestamp: new Date().toISOString()
        }
      };

      const response = await Http.request({
        url: 'https://api.emailjs.com/api/v1.0/email/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        content: JSON.stringify(emailData)
      });

      if (response.statusCode === 200) {
        console.log('Email sent successfully via EmailJS');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('EmailJS failed:', error);
      return false;
    }
  }

  private async sendViaFormspree(subject: string, body: string, type: string): Promise<boolean> {
    try {
      // Check if Formspree is configured
      if (EmailConfig.formspree.formID === 'your_form_id') {
        console.log('Formspree not configured - skipping');
        return false;
      }

      const formspreeEndpoint = `https://formspree.io/f/${EmailConfig.formspree.formID}`;

      const formData = {
        email: 'maruhsoft@gmail.com',
        subject: subject,
        message: body,
        type: type,
        timestamp: new Date().toISOString(),
        _replyto: 'noreply@celltowertracker.app'
      };

      const response = await Http.request({
        url: formspreeEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        content: JSON.stringify(formData)
      });

      if (response.statusCode === 200) {
        console.log('Email sent successfully via Formspree');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('Formspree failed:', error);
      return false;
    }
  }

  private async sendViaSMTP(subject: string, body: string, type: string): Promise<boolean> {
    try {
      // Check if SMTP is configured
      if (EmailConfig.smtp.apiEndpoint === 'https://api.your-smtp-service.com/send' || 
          EmailConfig.smtp.apiKey === 'your_api_key') {
        console.log('SMTP not configured - skipping');
        return false;
      }
      
      const smtpData = {
        to: 'maruhsoft@gmail.com',
        from: EmailConfig.smtp.fromEmail,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
        priority: type === 'ALERT' ? 'high' : 'normal'
      };

      const response = await Http.request({
        url: EmailConfig.smtp.apiEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EmailConfig.smtp.apiKey}`
        },
        content: JSON.stringify(smtpData)
      });

      if (response.statusCode === 200 || response.statusCode === 202) {
        console.log('Email sent successfully via SMTP');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('SMTP failed:', error);
      return false;
    }
  }
}