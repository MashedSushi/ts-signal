//------------------------------------------------------//
// Signal implementation in TypeScript.
// This is inspired by Signal+ by Alexander Lindbolt
// I love your works, Alexxander! <3

//GitHub (repository):
//https://github.com/AlexanderLindholt/SignalPlus

//GitBook (documentation):
//https://alexxander.gitbook.io/SignalPlus

//DevForum (topic):
//https://devforum.roblox.com/t/3552231
//------------------------------------------------------//

export interface Connection {
    disconnect(): void;

    connected: boolean;
}

export type Callback<T extends any[] = any[]> = (...args: T) => void;

interface Node<T extends any[]> extends Connection {
    _signal: Signal<T>;

    _prev: Node<T> | null;
    _next: Node<T> | null;

    _callback: Callback<T>;
}

export class Signal<T extends any[]> {

    private _head: Node<T> | null = null;
    private _tail: Node<T> | null = null;

    public destroyed = false;

    /**
     * Connects a callback to the signal.  
     * The callback will be called every time the signal is fired until it is disconnected.
     * @param callback - The callback to connect to the signal.
     * @returns Connection object that can be used to disconnect the callback.
     */
    public connect(callback: Callback<T>): Connection {
        if (this.destroyed) {
            throw new Error("Cannot connect to a destroyed signal.");

        }

        const head = this._head;

        const connection: Node<T> = {
            _signal: this,

            _prev: head,
            _next: null,

            _callback: callback,
            connected: true,
            disconnect() {
                if (!this.connected) return;
                this.connected = false;

                const { _signal, _prev, _next } = this;

                if (_prev) _prev._next = _next; 
                else _signal._tail = _next;

                if (_next) _next._prev = _prev; 
                else _signal._head = _prev;
            }
        };

        if (head) {
            head._next = connection;
        } else {
            this._tail = connection;
        }
        this._head = connection;

        return connection;
    }

    /**
     * Connects a callback to the signal that will be called at most once.  
     * After the callback is called, it will be automatically disconnected from the signal.
     * @param callback - The callback to connect to the signal.
     * @returns Connection object that can be used to disconnect the callback before it is called.
     */
    public once(callback: Callback<T>): Connection {
        const connection = this.connect((...args) => {
            connection.disconnect();
            callback(...args);
        });
        return connection;
    }

    /**
     * Returns a promise that resolves the next time the signal is fired.
     * The promise resolves with the arguments passed to the signal when it is fired.  
     * @returns Promise that resolves with the arguments passed to the signal when it is fired.
     */
    public wait(): Promise<T> {
        return new Promise((resolve) => {
            const connection = this.connect((...args) => {
                connection.disconnect();
                resolve(args);
            });
        });
    }

    /**
     * Fires the signal, calling all connected callbacks with the provided arguments.
     * If a callback throws an error, it will be caught and logged, allowing other callbacks to continue executing.
     * @param args - The arguments to pass to the connected callbacks.
     */
    public fire(...args: T): void {
        if (this.destroyed) {
            throw new Error("Cannot fire a destroyed signal.");
        }

        let connection = this._tail;

        while (connection) {
            const nextConnection = connection._next;

            if (connection.connected) {
                try {
                    connection._callback(...args);
                } catch (error) {
                    console.error('Error in signal callback:', error);
                }
            }

            connection = nextConnection; 
        }
    }

    /**
     * Disconnnect all the connections from this signal.
     */
    public disconnectAll(): void {
        if (this.destroyed) {
            throw new Error("Cannot disconnect from a destroyed signal.");
        }
        let connection = this._tail;

        while (connection) {
            const { _next } = connection;
            connection.connected = false;
            connection._prev = null;
            connection._next = null;
            connection = _next;
        }

        this._head = null;
        this._tail = null;
    }

    /**
     * Simply calls ``disconnectAll()``.  
     * After calling this method, the signal should not be used.
     */
    public destroy(): void {
        this.disconnectAll();

        this.destroyed = true;
    }
}