import { WriteBufferStream } from "./BufferStream";
import { DicomMessage } from "./DicomMessage";

const EXPLICIT_LITTLE_ENDIAN = "1.2.840.10008.1.2.1";

class DicomDict {
    constructor(meta) {
        this.meta = meta;
        this.dict = {};
    }

    upsertTag(tag, vr, values) {
        if (this.dict[tag]) {
            this.dict[tag].Value = values;
        } else {
            this.dict[tag] = { vr: vr, Value: values };
        }
    }

    /**
     * Given a tag, return a single value from that tag
     * @param {String} tag
     * @return {String}
     */
    getValue(tag) {
        let tagObject = null;
        if (tag in this.dict) {
            tagObject = this.dict[tag];
        } else if (tag in this.meta) {
            tagObject = this.meta[tag];
        } else {
            return "";
        }

        if (!tagObject.Value || !tagObject.Value.length) {
            return "";
        }
        if (typeof tagObject.Value === "string") {
            return tagObject.Value;
        }
        if (Array.isArray(tagObject.Value)) {
            return tagObject.Value[0];
        }
        return "";
    }

    /**
     * Given a tag, return all values from that tag
     * @param {String} tag
     * @return {(Object|String)[]}
     */
    getValues(tag) {
        let tagObject = null;
        if (tag in this.dict) {
            tagObject = this.dict[tag];
        } else if (tag in this.meta) {
            tagObject = this.meta[tag];
        } else {
            return [];
        }

        if (!tagObject.Value || !tagObject.Value.length) {
            return [];
        }
        if (typeof tagObject.Value === "string") {
            return [tagObject.Value];
        }
        if (Array.isArray(tagObject.Value)) {
            return tagObject.Value;
        }
        return [];
    }

    write() {
        var metaSyntax = EXPLICIT_LITTLE_ENDIAN;
        var fileStream = new WriteBufferStream(4096, true);
        fileStream.writeHex("00".repeat(128));
        fileStream.writeString("DICM");

        var metaStream = new WriteBufferStream(1024);
        if (!this.meta["00020010"]) {
            this.meta["00020010"] = {
                vr: "UI",
                Value: [EXPLICIT_LITTLE_ENDIAN]
            };
        }
        DicomMessage.write(this.meta, metaStream, metaSyntax);
        DicomMessage.writeTagObject(
            fileStream,
            "00020000",
            "UL",
            metaStream.size,
            metaSyntax
        );
        fileStream.concat(metaStream);

        var useSyntax = this.meta["00020010"].Value[0];
        DicomMessage.write(this.dict, fileStream, useSyntax);
        return fileStream.getBuffer();
    }
}

export { DicomDict };
