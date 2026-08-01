export class ESCPOSEncoder {
    constructor() {
        this.buffer = [];
    }

    // Convert string to bytes
    _encodeText(text) {
        // Simple encoding for standard ASCII
        const bytes = [];
        for (let i = 0; i < text.length; i++) {
            bytes.push(text.charCodeAt(i));
        }
        return bytes;
    }

    // Initialize printer
    initialize() {
        this.buffer.push(0x1b, 0x40);
        return this;
    }

    // Set alignment: 0=Left, 1=Center, 2=Right
    align(align = 0) {
        this.buffer.push(0x1b, 0x61, align);
        return this;
    }

    // Set bold: 0=Off, 1=On
    bold(bold = 0) {
        this.buffer.push(0x1b, 0x45, bold);
        return this;
    }

    // Print text
    text(str) {
        this.buffer.push(...this._encodeText(str));
        return this;
    }

    // Print text with newline
    line(str) {
        this.text(str);
        this.newline();
        return this;
    }

    // Print newline
    newline(lines = 1) {
        for (let i = 0; i < lines; i++) {
            this.buffer.push(0x0a);
        }
        return this;
    }

    // Draw horizontal line
    separator(char = '-', length = 32) {
        this.line(char.repeat(length));
        return this;
    }

    // Print a key-value row (e.g., Total: 10.000)
    row(key, value, length = 32) {
        const space = length - key.length - value.length;
        if (space > 0) {
            this.line(key + ' '.repeat(space) + value);
        } else {
            this.line(key + ' ' + value);
        }
        return this;
    }

    // Cut paper
    cut() {
        // Feed and cut (GS V 0)
        this.buffer.push(0x1d, 0x56, 0x41, 0x03);
        return this;
    }

    // Return the final Uint8Array buffer
    build() {
        return new Uint8Array(this.buffer);
    }
}
