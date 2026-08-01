import { useState, useRef } from 'react';

export function useBluetoothPrinter() {
    const [isSupported] = useState('bluetooth' in navigator);
    const [isConnected, setIsConnected] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const deviceRef = useRef(null);
    const serverRef = useRef(null);
    const characteristicRef = useRef(null);

    const connect = async () => {
        if (!isSupported) {
            throw new Error('Web Bluetooth API tidak didukung di browser ini.');
        }

        try {
            // Request Bluetooth device
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
            }).catch(e => {
                // Fallback to acceptAllDevices if specific service filter fails
                return navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '0000fee7-0000-1000-8000-00805f9b34fb']
                });
            });

            device.addEventListener('gattserverdisconnected', onDisconnected);
            deviceRef.current = device;

            // Connect to GATT Server
            const server = await device.gatt.connect();
            serverRef.current = server;

            // Get primary service (commonly 18F0 for generic thermal printers, or E7810A71 for specific ones)
            // We'll iterate through services to find the write characteristic
            const services = await server.getPrimaryServices();
            let writeCharacteristic = null;
            
            for (const service of services) {
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        writeCharacteristic = char;
                        break;
                    }
                }
                if (writeCharacteristic) break;
            }

            if (!writeCharacteristic) {
                throw new Error('Karakteristik Write tidak ditemukan pada printer ini.');
            }

            characteristicRef.current = writeCharacteristic;
            setIsConnected(true);
            return true;
        } catch (error) {
            console.error('Bluetooth Connection Error:', error);
            throw error;
        }
    };

    const onDisconnected = () => {
        setIsConnected(false);
        deviceRef.current = null;
        serverRef.current = null;
        characteristicRef.current = null;
    };

    const disconnect = () => {
        if (deviceRef.current && deviceRef.current.gatt.connected) {
            deviceRef.current.gatt.disconnect();
        }
    };

    const print = async (uint8Array) => {
        if (!characteristicRef.current) {
            throw new Error('Printer belum terhubung.');
        }

        setIsPrinting(true);
        try {
            // BLE characteristic write limit is typically 512 bytes, often safely chunked at 100-200 bytes
            const CHUNK_SIZE = 100;
            for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
                const chunk = uint8Array.slice(i, i + CHUNK_SIZE);
                if (characteristicRef.current.properties.writeWithoutResponse) {
                    await characteristicRef.current.writeValueWithoutResponse(chunk);
                } else {
                    await characteristicRef.current.writeValue(chunk);
                }
                // Small delay to prevent printer buffer overflow
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        } catch (error) {
            console.error('Print Error:', error);
            throw error;
        } finally {
            setIsPrinting(false);
        }
    };

    return {
        isSupported,
        isConnected,
        isPrinting,
        connect,
        disconnect,
        print,
    };
}
