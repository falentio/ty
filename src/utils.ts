import type { TypedEvent, TypedEventEmitter, TypedEventValue } from "./ty.ts";

export async function* on<T extends TypedEvent<unknown>>({
    ty,
    event,
    signal,
}: {
    ty: TypedEventEmitter;
    event: T;
    signal: AbortController["signal"];
}): AsyncGenerator<TypedEventValue<T>> {
    const queue: Array<TypedEventValue<T>> = [];
    const resolvers: Array<
        (
            value: IteratorResult<TypedEventValue<T>>,
        ) => void
    > = [];

    const listener = (payload: TypedEventValue<T>) => {
        const resolve = resolvers.shift();
        if (resolve) {
            resolve({ value: payload, done: false });
        } else {
            queue.push(payload);
        }
    };

    const cleanup = ty.on(event, listener);
    const abort = () => {
        cleanup();
        let resolve;
        while ((resolve = resolvers.shift())) {
            resolve({ value: undefined as never, done: true });
        }
    };
    signal.addEventListener("abort", abort, { once: true });

    try {
        while (true) {
            if (queue.length > 0) {
                yield queue.shift()!;
                continue;
            }
            const result = await new Promise<
                IteratorResult<TypedEventValue<T>>
            >((resolve) => {
                resolvers.push(resolve);
            });
            if (result.done) break;
            yield result.value;
        }
    } finally {
        signal.removeEventListener("abort", abort);
        cleanup();
    }
}
