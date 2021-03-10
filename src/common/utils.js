export function mergeProperties(dest, src) {
    Object.getOwnPropertyNames(src).forEach(function forEachOwnPropertyName (name) {
        if (Object.hasOwnProperty.call(dest, name)) {
            return
        }
        const descriptor = Object.getOwnPropertyDescriptor(src, name);
        Object.defineProperty(dest, name, descriptor)
    });
    return dest
}

export const defaultDescriptor = {
    writable: true,
    enumerable: true,
    configurable: false,
};
