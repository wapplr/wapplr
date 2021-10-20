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

export function copyObject(obj) {

    function cloneObj() {
        const clone = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                clone[key] = copyObject(obj[key]);
            }
        }
        return clone;
    }

    function cloneArr() {
        return obj.map(function (item) {
            return copyObject(item);
        });
    }

    const transformedObject = obj && obj.toJSON ? obj.toJSON() : obj;
    const type = Object.prototype.toString.call(transformedObject).slice(8, -1).toLowerCase();

    if (type === "object") {
        return cloneObj();
    }

    if (type === "array") {
        return cloneArr();
    }

    return obj;

}
