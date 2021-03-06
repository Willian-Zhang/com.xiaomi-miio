"use strict";

const Homey = require('homey');
const miio = require('miio');

class MiAirMonitorDevice extends Homey.Device {

  onInit() {
    this.createDevice();

    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    if (typeof this.miio !== "undefined") {
      this.miio.destroy();
    }
  }

  // LISTENERS FOR UPDATING CAPABILITIES
  onCapabilityOnoff(value, opts, callback) {
    this.miio.setPower(value)
      .then(result => { callback(null, value) })
      .catch(error => { callback(error, false) });
  }

  // HELPER FUNCTIONS
  createDevice() {
    miio.device({
      address: this.getSetting('address'),
      token: this.getSetting('token')
    }).then(miiodevice => {
      if (!this.getAvailable()) {
        this.setAvailable();
      }
      this.miio = miiodevice;

      var interval = this.getSetting('polling') || 60;
      this.pollDevice(interval);
    }).catch((error) => {
      this.log(error);
      this.setUnavailable(Homey.__('unreachable'));
      setTimeout(() => {
        this.createDevice();
      }, 10000);
    });
  }

  pollDevice(interval) {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      const getData = async () => {
        try {
          const power = await this.miio.power();
          const battery = await this.miio.batteryLevel();
          const aqi = await this.miio.pm2_5();

          if (this.getCapabilityValue('onoff') != power) {
            this.setCapabilityValue('onoff', power);
          }
          if (this.getCapabilityValue('measure_battery') != battery) {
            this.setCapabilityValue('measure_battery', battery);
          }
          if (this.getCapabilityValue('measure_pm25') != aqi) {
            this.setCapabilityValue('measure_pm25', aqi);
          }
          if (!this.getAvailable()) {
            this.setAvailable();
          }
        } catch (error) {
          this.log(error);
          clearInterval(this.pollingInterval);
          this.setUnavailable(Homey.__('unreachable'));
          setTimeout(() => {
            this.createDevice();
          }, 1000 * interval);
        }
      }
      getData();
    }, 1000 * interval);
  }
}

module.exports = MiAirMonitorDevice;
