declare const brand: unique symbol;

/**
 * A typed event that carries a specific payload type. This is a branded string type
 * that provides compile-time type safety for event handling.
 *
 * @template T The type of data that this event carries
 */
export type TypedEvent<T = unknown> = string & {
    [brand]?: T;
};

/**
 * Extracts the payload type from a TypedEvent.
 *
 * @template T The TypedEvent to extract the payload type from
 */
export type TypedEventValue<T extends TypedEvent<unknown>> = T extends
    TypedEvent<infer U> ? U : never;

/**
 * A listener function for a typed event that receives the event's payload.
 *
 * @template T The TypedEvent this listener handles
 * @param payload The payload payload of the event
 */
export type TypedEventListener<
    T extends TypedEvent<unknown> = TypedEvent<unknown>,
> = (payload: TypedEventValue<T>) => void;

const createdEvents = new Set<string>();

/**
 * Creates a new typed event with the specified name and payload type.
 * Ensures that event names are unique across the application.
 *
 * @template T The type of data this event will carry
 * @param name The unique name for this event
 * @returns A TypedEvent that can be used with TypedEventEmitter
 * @throws Error if an event with the same name already exists
 */
export function createTypedEvent<T = void>(name: string): TypedEvent<T> {
    if (createdEvents.has(name)) {
        throw new Error(`Event with name "${name}" already created`);
    }
    createdEvents.add(name);
    return name as TypedEvent<T>;
}

/**
 * A special event that is emitted when an error occurs during event listener execution.
 * This event carries the error that was thrown by a listener.
 */
export const TypedEventEmitterError: TypedEvent<{
    error: unknown;
    event: TypedEvent<unknown>;
    payload: unknown;
}> = createTypedEvent("TypedEventEmitterError");

/**
 * A type-safe event emitter that ensures event names and their payload types
 * are consistent throughout the application. Provides methods to register
 * listeners, emit events, and manage event subscriptions.
 */
export class TypedEventEmitter {
    private listeners: Map<TypedEvent, TypedEventListener[]> = new Map();

    /**
     * Registers a listener for the specified event.
     *
     * @template T The TypedEvent to listen for
     * @param event The event to listen for
     * @param listener The function to call when the event is emitted
     * @returns A function that can be called to remove this listener
     */
    on<T extends TypedEvent<unknown>>(
        event: T,
        listener: TypedEventListener<T>,
    ): () => void {
        const listeners = this.listeners.get(event) || [];
        listeners.push(listener);
        this.listeners.set(event, listeners);
        return () => this.off(event, listener);
    }

    /**
     * Emits an event with the specified payload to all registered listeners.
     * If any listener throws an error, it will be caught and emitted as a
     * TypedEventEmitterError event.
     *
     * @template T The TypedEvent to emit
     * @param event The event to emit
     * @param payload The payload to send with the event
     */
    emit<T extends TypedEvent<unknown>>(event: T, payload: TypedEventValue<T>) {
        const listeners = this.listeners.get(event) || [];
        listeners.slice().forEach((listener) => {
            try {
                listener(payload);
            } catch (error) {
                this.emit(TypedEventEmitterError, {
                    error,
                    event,
                    payload,
                });
            }
        });
    }

    /**
     * Removes a specific listener from an event.
     *
     * @template T The TypedEvent to remove the listener from
     * @param event The event to remove the listener from
     * @param listener The specific listener function to remove
     */
    off<T extends TypedEvent<unknown>>(
        event: T,
        listener: TypedEventListener<T>,
    ) {
        const listeners = this.listeners.get(event) || [];
        this.listeners.set(
            event,
            listeners.filter((l) => l !== listener),
        );
    }

    /**
     * Registers a listener that will only be called once for the specified event.
     * After the first emission, the listener is automatically removed.
     *
     * @template T The TypedEvent to listen for
     * @param event The event to listen for
     * @param listener The function to call when the event is emitted
     * @returns A function that can be called to remove this listener before it fires
     */
    once<T extends TypedEvent<unknown>>(
        event: T,
        listener: TypedEventListener<T>,
    ): () => void {
        const onceListener = (payload: TypedEventValue<T>) => {
            this.off(event, onceListener);
            listener(payload);
        };
        return this.on(event, onceListener);
    }
}
