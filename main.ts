// Two cases : bound for position or client who searching position

function ConfigureBoundary(position: number) {
    basic.clearScreen()
    radio.setGroup(1);
    led.setBrightness(255)
    radio.setTransmitSerialNumber(true)

    let transmitPower = 6;
    input.onButtonPressed(Button.A, () => {
        transmitPower = (transmitPower + 1) % 8
        radio.setTransmitPower(transmitPower)
        basic.showNumber(transmitPower)
    })
    input.onButtonPressed(Button.B, () => { })
    radio.onReceivedString(msg => {
        if (msg !== "REQ") {
            return;
        }
        basic.pause(position * 150)
        const id = radio.receivedPacket(1);
        radio.sendString(`ACK:${id}:${position}`)
        basic.showIcon(IconNames.SmallSquare)
        basic.showIcon(IconNames.Square)
        basic.showIcon(IconNames.SmallSquare)
        basic.pause(300)
        basic.clearScreen()
    })
}

function transformPower(value: number): number {
    // Affine function y = x (-√2/20) + 5√2
    return value * (Math.sqrt(2) / -20) + 5 * Math.sqrt(2);
}

function computePosition(strengths: number[]) {
    //basic.showIcon(IconNames.Rollerskate)
    const longDistance = Math.sqrt(2) * 4
    // Transform power to relative distance. 100 is distance 0, 50 is half, 20 is long (arbiatrary)
    const dA = transformPower(strengths[0]);
    const dB = transformPower(strengths[1]);
    const dC = transformPower(strengths[2]);
    // Resolve equation
    const y = Math.sqrt(dA * dA - Math.pow((dA * dA - dB * dB + 16) / 8, 2))
    const x = Math.sqrt(dA * dA - y * y)
    basic.clearScreen()
    led.plot(x, y)
}

function ConfigureClient() {
    radio.setGroup(1)

    radio.setTransmitSerialNumber(true)
    led.setBrightness(255)
    basic.clearScreen()
    let strengths = [0, 0, 0]
    let count = 0
    input.onButtonPressed(Button.A, () => {
        strengths = [0, 0, 0]
        //basic.clearScreen()
        radio.sendString("REQ")
    });

    radio.onReceivedString(msg => {
        if (msg.indexOf("ACK:") === 0) {
            const id = parseInt(msg.split(":")[1])
            if (id !== control.deviceSerialNumber()) {
                return;
            }
        } else {
            return;
        }
        const position = parseInt(msg.split(":")[2])
        const signal = radio.receivedPacket(2) + 128
        strengths[position] = signal;
        showReception(strengths.filter(v => v !== 0).length)
        if (!strengths.some(v => v === 0)) {
            computePosition(strengths);
        }
    })
}

function showReception(value: number) {
    basic.clearScreen();
    led.plot(0, 0)
    if (value > 1) {
        led.plot(1, 0)
    }
    if (value > 2) {
        led.plot(2, 0)
    }
}

class Configuration {
    constructor(private isBoundary: boolean = true) {
        new KindConfig((isBoundary: boolean) => this.finishConfig(isBoundary));
    }
    finishConfig(isBoundary: boolean) {
        this.isBoundary = isBoundary;
        if (this.isBoundary) {
            new ChooseBoundaryPosition((position: number) => ConfigureBoundary(position));
        } else {
            ConfigureClient();
        }
    }
}

class KindConfig {
    constructor(next: (isBoudary: boolean) => void, private isBoundary: boolean = true) {
        input.onButtonPressed(Button.A, () => this.changeKind());
        input.onButtonPressed(Button.B, () => next(this.isBoundary));
        this.show();
    }
    changeKind() {
        this.isBoundary = !this.isBoundary;
        this.show();
    }
    show() {
        if (this.isBoundary) {
            basic.showIcon(IconNames.Square)
        } else {
            basic.clearScreen()
            led.plot(2, 2)
        }
    }
}

class ChooseBoundaryPosition {
    constructor(next: (position: number) => void, private position: number = 0) {
        input.onButtonPressed(Button.A, () => this.changePosition());
        input.onButtonPressed(Button.B, () => next(this.position));
        this.show();
    }
    changePosition() {
        this.position = (this.position + 1) % 3;
        this.show();
    }
    show() {
        basic.clearScreen();
        switch (this.position) {
            case 0: showBlock(0, 0); break;
            case 1: showBlock(3, 0); break;
            //case 2: showBlock(3, 3); break;
            case 2: showBlock(0, 3); break;
        }
    }
}

function showBlock(x: number, y: number) {
    led.plot(x, y)
    led.plot(x, y + 1)
    led.plot(x + 1, y)
    led.plot(x + 1, y + 1)
}

new Configuration()