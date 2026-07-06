import fetch from "node-fetch";
import crypto from "crypto";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

/**
 * Upload image to telegra.ph
 * Supported mimetype:
 * - `image/jpeg`
 * - `image/jpg`
 * - `image/png`s
 * @param {Buffer} buffer Image Buffer
 * @return {Promise<string>}
 */
/*export default async (buffer) => {
  const { ext, mime } = await fileTypeFromBuffer(buffer);
  let form = new FormData();
  const blob = new Blob([buffer.toArrayBuffer()], { type: mime });
  form.append("file", blob, "tmp." + ext);
  let res = await fetch("https://telegra.ph/upload", {
    method: "POST",
    body: form,
  });
  let img = await res.json();
  if (img.error) throw img.error;
  return "https://telegra.ph" + img[0].src;
};*/
export default async function (content) {
  const { ext, mime } = (await fileTypeFromBuffer(content)) || {};
  const blob = new Blob([content.toArrayBuffer()], { type: mime });
  const formData = new FormData();
  const randomBytes = crypto.randomBytes(5).toString("hex");
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, randomBytes + "." + ext);

  const response = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: formData,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
    },
  });

  return await response.text();
}