export class DbOperationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Veritabanı işlemi ${timeoutMs}ms içinde tamamlanamadı.`);
    this.name = "DbOperationTimeoutError";
  }
}

export function withDbTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "db",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new DbOperationTimeoutError(timeoutMs));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          reject(error);
          return;
        }
        reject(new Error(`${label} işlemi başarısız.`));
      });
  });
}
