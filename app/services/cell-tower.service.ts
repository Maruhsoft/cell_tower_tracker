import { Observable } from '@nativescript/core';
import { isAndroid, isIOS } from '@nativescript/core/platform';

export interface CellTowerInfo {
  mcc: string;
  mnc: string;
  lac: string;
  cid: string;
  signalStrength: number;
  networkType: string;
  carrierName: string;
  countryCode: string;
  rssi: number;
}

export class CellTowerService extends Observable {
  
  public async getCellTowerInfo(): Promise<CellTowerInfo | null> {
    try {
      if (isAndroid) {
        return await this.getAndroidCellInfo();
      } else if (isIOS) {
        return await this.getIOSCellInfo();
      } else {
        throw new Error('Platform not supported');
      }
    } catch (error) {
      console.error('Error getting cell tower info:', error);
      return null;
    }
  }

  private async getAndroidCellInfo(): Promise<CellTowerInfo | null> {
    try {
      const context = require('@nativescript/core').Utils.android.getApplicationContext();
      const telephonyManager = context.getSystemService(android.content.Context.TELEPHONY_SERVICE);
      
      if (!telephonyManager) {
        throw new Error('TelephonyManager not available');
      }

      // Check for required permissions
      const PackageManager = android.content.pm.PackageManager;
      const locationPermission = context.checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION);
      const phonePermission = context.checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE);
      
      if (locationPermission !== PackageManager.PERMISSION_GRANTED) {
        throw new Error('Location permission required');
      }

      // Get basic network operator info (this should work with just location permission)
      let networkOperator = '';
      let mcc = 'Unknown';
      let mnc = 'Unknown';
      let carrierName = 'Unknown';
      let countryCode = 'Unknown';
      let networkType = 'Unknown';

      try {
        networkOperator = telephonyManager.getNetworkOperator() || '';
        if (networkOperator && networkOperator.length >= 5) {
          mcc = networkOperator.substring(0, 3);
          mnc = networkOperator.substring(3);
        }
        
        carrierName = telephonyManager.getNetworkOperatorName() || 'Unknown';
        countryCode = telephonyManager.getNetworkCountryIso() || 'Unknown';
        networkType = this.getNetworkTypeString(telephonyManager.getNetworkType());
      } catch (error) {
        console.log('Error getting basic network info:', error);
      }

      // Try to get more detailed cell info
      let lac = 'Unknown';
      let cid = 'Unknown';
      let signalStrength = 0;
      let rssi = -999;

      try {
        if (android.os.Build.VERSION.SDK_INT >= 17) {
          const cellInfos = telephonyManager.getAllCellInfo();
          if (cellInfos && cellInfos.size() > 0) {
            for (let i = 0; i < cellInfos.size(); i++) {
              const cellInfo = cellInfos.get(i);
              
              if (cellInfo.isRegistered()) {
                if (cellInfo instanceof android.telephony.CellInfoGsm) {
                  const gsmCellInfo = cellInfo as android.telephony.CellInfoGsm;
                  const identity = gsmCellInfo.getCellIdentity();
                  const signalStrengthInfo = gsmCellInfo.getCellSignalStrength();
                  
                  if (identity.getLac() !== android.telephony.CellInfo.UNAVAILABLE) {
                    lac = identity.getLac().toString();
                  }
                  if (identity.getCid() !== android.telephony.CellInfo.UNAVAILABLE) {
                    cid = identity.getCid().toString();
                  }
                  signalStrength = this.mapSignalStrength(signalStrengthInfo.getLevel());
                  rssi = signalStrengthInfo.getDbm();
                  break;
                } else if (cellInfo instanceof android.telephony.CellInfoLte) {
                  const lteCellInfo = cellInfo as android.telephony.CellInfoLte;
                  const identity = lteCellInfo.getCellIdentity();
                  const signalStrengthInfo = lteCellInfo.getCellSignalStrength();
                  
                  if (android.os.Build.VERSION.SDK_INT >= 24) {
                    if (identity.getTac() !== android.telephony.CellInfo.UNAVAILABLE) {
                      lac = identity.getTac().toString();
                    }
                  }
                  if (identity.getCi() !== android.telephony.CellInfo.UNAVAILABLE) {
                    cid = identity.getCi().toString();
                  }
                  signalStrength = this.mapSignalStrength(signalStrengthInfo.getLevel());
                  rssi = signalStrengthInfo.getDbm();
                  break;
                } else if (cellInfo instanceof android.telephony.CellInfoWcdma) {
                  const wcdmaCellInfo = cellInfo as android.telephony.CellInfoWcdma;
                  const identity = wcdmaCellInfo.getCellIdentity();
                  const signalStrengthInfo = wcdmaCellInfo.getCellSignalStrength();
                  
                  if (identity.getLac() !== android.telephony.CellInfo.UNAVAILABLE) {
                    lac = identity.getLac().toString();
                  }
                  if (identity.getCid() !== android.telephony.CellInfo.UNAVAILABLE) {
                    cid = identity.getCid().toString();
                  }
                  signalStrength = this.mapSignalStrength(signalStrengthInfo.getLevel());
                  rssi = signalStrengthInfo.getDbm();
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.log('Error getting detailed cell info:', error);
        // Continue with basic info even if detailed info fails
      }

      // If we have at least basic network info, return it
      if (mcc !== 'Unknown' || carrierName !== 'Unknown') {
        return {
          mcc,
          mnc,
          lac,
          cid,
          signalStrength,
          networkType,
          carrierName,
          countryCode,
          rssi
        };
      }

      return null;
    } catch (error) {
      console.error('Android cell info error:', error);
      return null;
    }
  }

  private async getIOSCellInfo(): Promise<CellTowerInfo | null> {
    try {
      // iOS has limited access to cell tower information due to privacy restrictions
      // We can only get basic carrier information
      const CTTelephonyNetworkInfo = (CTTelephonyNetworkInfo as any);
      const networkInfo = CTTelephonyNetworkInfo.alloc().init();
      
      let carrierName = 'Unknown';
      let mcc = 'Unknown';
      let mnc = 'Unknown';
      let countryCode = 'Unknown';
      
      if (networkInfo.subscriberCellularProvider) {
        const carrier = networkInfo.subscriberCellularProvider;
        carrierName = carrier.carrierName || 'Unknown';
        mcc = carrier.mobileCountryCode || 'Unknown';
        mnc = carrier.mobileNetworkCode || 'Unknown';
        countryCode = carrier.isoCountryCode || 'Unknown';
      }
      
      // Most detailed cell info is not available on iOS for privacy reasons
      return {
        mcc,
        mnc,
        lac: 'Restricted', // iOS doesn't provide this
        cid: 'Restricted', // iOS doesn't provide this
        signalStrength: 0, // Would need Core Telephony private APIs
        networkType: 'Unknown',
        carrierName,
        countryCode,
        rssi: -999
      };
    } catch (error) {
      console.error('iOS cell info error:', error);
      return null;
    }
  }

  private getNetworkTypeString(networkType: number): string {
    // Android network type constants
    const types: { [key: number]: string } = {
      0: 'Unknown',
      1: 'GPRS',
      2: 'EDGE',
      3: 'UMTS',
      4: 'CDMA',
      5: 'EVDO_0',
      6: 'EVDO_A',
      7: '1xRTT',
      8: 'HSDPA',
      9: 'HSUPA',
      10: 'HSPA',
      11: 'iDEN',
      12: 'EVDO_B',
      13: 'LTE',
      14: 'eHRPD',
      15: 'HSPA+',
      16: 'GSM',
      17: 'TD_SCDMA',
      18: 'IWLAN',
      19: 'LTE_CA',
      20: 'NR' // 5G
    };
    
    return types[networkType] || `Unknown (${networkType})`;
  }

  private mapSignalStrength(level: number): number {
    // Android signal strength levels (0-4)
    return Math.max(0, Math.min(100, level * 25));
  }
}