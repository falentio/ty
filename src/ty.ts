declare const brand: unique symbol;

export type TypedEvent<T = unknown> = string & {
	[brand]?: T;
};

export type TypedEventValue<T extends TypedEvent<unknown>> =
	T extends TypedEvent<infer U> ? U : never;

export type TypedEventListener<
	T extends TypedEvent<unknown> = TypedEvent<unknown>,
> = (value: TypedEventValue<T>) => void;

const createdEvents = new Set<string>();
export function createTypedEvent<T = unknown>(name: string): TypedEvent<T> {
	if (createdEvents.has(name)) {
		throw new Error(`Event with name "${name}" already created`);
	}
	createdEvents.add(name);
	return name as TypedEvent<T>;
}

export const TypedEventEmitterError: TypedEvent<unknown> = createTypedEvent(
	"TypedEventEmitterError",
);

export class TypedEventEmitter {
	private listeners: Map<TypedEvent, TypedEventListener[]> = new Map();

	on<T extends TypedEvent<unknown>>(
		event: T,
		listener: TypedEventListener<T>,
	): () => void {
		const listeners = this.listeners.get(event) || [];
		listeners.push(listener);
		this.listeners.set(event, listeners);
		return () => this.off(event, listener);
	}

	emit<T extends TypedEvent<unknown>>(event: T, value: TypedEventValue<T>) {
		const listeners = this.listeners.get(event) || [];
		listeners.slice().forEach((listener) => {
			try {
				listener(value);
			} catch (error) {
				this.emit(TypedEventEmitterError, error);
			}
		});
	}

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

	once<T extends TypedEvent<unknown>>(
		event: T,
		listener: TypedEventListener<T>,
	): () => void {
		const onceListener = (value: TypedEventValue<T>) => {
			this.off(event, onceListener);
			listener(value);
		};
		return this.on(event, onceListener);
	}
}
