import type {
	TypedEvent,
	TypedEventEmitter,
	TypedEventValue,
} from "./ty.ts";

export async function* on<T extends TypedEvent<unknown>>({
	ty,
	event,
	signal,
}: {
	ty: TypedEventEmitter;
	event: T;
	signal: AbortController["signal"];
}): AsyncGenerator<TypedEventValue<T>> {
	if (signal.aborted) {
		return;
	}

	const payloads: TypedEventValue<T>[] = [];
	let deferred: { promise: Promise<void>; resolve: () => void; } | null = null;

	const listener = (payload: TypedEventValue<T>) => {
		payloads.push(payload);
		if (deferred) {
			deferred.resolve();
			deferred = null;
		}
	};

	const off = ty.on(event, listener);

	const abortHandler = () => {
		if (deferred) {
			deferred.resolve();
			deferred = null;
		}
	};
	signal.addEventListener("abort", abortHandler, { once: true });

	try {
		while (!signal.aborted) {
			if (payloads.length > 0) {
				yield payloads.shift()!;
			} else {
				const promise = new Promise<void>((resolve) => {
					deferred = { promise: null as any, resolve };
				});
				deferred!.promise = promise;
				await promise;
			}
		}
	} finally {
		off();
		signal.removeEventListener("abort", abortHandler);
	}
}
