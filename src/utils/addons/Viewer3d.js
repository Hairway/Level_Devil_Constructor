export class Viewer3d {
   
	name = "viewer3d";
    
	params;
    funComplete;
    zip;

    constructor(params) {
        this.params = params;
    }

    //---------------------------------------------------------------------

    load(funComplete) {
        this.funComplete = funComplete;

        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('n');

        if (!id) {
            console.warn("[Viewer3d] no ?n= param");
            return this.funComplete(this.params);
        }

        const zipUrl = `https://viewer3d.adrawer.com/scenePreview_${id}.zip?t=${Date.now()}`;

        this.#loadZipBase64(zipUrl, (base64) => {
            if (!base64) {
                console.warn("[Viewer3d] zip load failed");
                return this.funComplete(this.params);
            }

            this.zip = "data:application/zip;base64," + base64;

            this.funComplete(this.params);
        });
    }

    //---------------------------------------------------------------------
    
	#loadZipBase64(url, callback) {
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.blob();
            })
            .then(blob => {
                const reader = new FileReader();

                reader.onload = () => {
                    const result = reader.result;

                    const base64 = result.split(",")[1] || "";
                    callback(base64);
                };

                reader.onerror = () => {
                    callback(null);
                };

                reader.readAsDataURL(blob);
            })
            .catch((e) => {
                console.warn("[Viewer3d] fetch error:", e);
                callback(null);
            });
    }
}