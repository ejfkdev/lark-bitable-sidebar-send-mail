export const ParallelPromise = (p?: number, _awaitStop?: boolean) => {
  const paralle = (p ?? 2) < 1 ? 2 : p ?? 2;
  const awaitStop = _awaitStop ?? true;
  let _done: boolean | null = null;
  const launch = new Set();
  let [promiseStop, resolveStop]: [any, any] = [null, null];
  let [promiseAdd, resolveAdd]: [any, any] = [null, null];
  let wating: any = null;
  const add = (fn: any) => {
    if (launch.size >= paralle) {
      if (promiseAdd === null) {
        ({ promise: promiseAdd, resolve: resolveAdd } =
          Promise.withResolvers());
      }
      return promiseAdd;
    }
    launch.add(fn);
    Promise.resolve(fn).finally(() => {
      resolveAdd?.();
      promiseAdd = null;
      launch.delete(fn);
    });
    return true;
  };
  const addRun = (fn: any) => {
    const wait = add(fn);
    run();
    return wait;
  };
  const wait = async () => _wait();
  const _wait = async (fn?: any) => {
    if (wating) {
      return wating;
    }

    while (
      // eslint-disable-next-line no-unmodified-loop-condition
      _done === false ||
      launch.size > 0
    ) {
      if (awaitStop) {
        await promiseStop;
      }
      await fn?.();
      await Promise.any(launch);
    }
    wating = null;
    return wating;
  };
  const run = () => {
    if (!wating) {
      wating = _wait();
    }
    resolveStop?.();
    promiseStop = null;
  };
  const stop = () => {
    if (!promiseStop) {
      ({ promise: promiseStop, resolve: resolveStop } =
        Promise.withResolvers());
    }
    return promiseStop;
  };
  const done = () => {
    _done = true;
  };
  const _addGenerator = async (creator: any) => {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (_done === false && launch.size < paralle) {
      await add(creator?.());
    }
  };
  const addRunWait = async function (creator: any) {
    _done = false;
    return await _wait(async () => _addGenerator(creator));
  };
  return {
    stop,
    done,
    add,
    run,
    wait,
    addRun,
    addRunWait,
  };
};

export default ParallelPromise;
