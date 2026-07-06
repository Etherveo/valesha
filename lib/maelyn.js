import axios from 'axios';

async function MealynAPI(endpoint, params) {
    try {
        const apiUrl = `https://api.maelyn.tech${endpoint}`;
        const response = await axios.get(apiUrl, {
            params: params,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error("API Call Error:", error);
        throw error;
    }
}

async function MealynCDN(pdfFilePath) {
    const uploadUrl = "https://cdn.maelyn.tech/api/upload";
  
    try {
      if (!fs.existsSync(pdfFilePath)) {
        throw new Error(`PDF file not found at ${pdfFilePath}`);
      }
  
      const formData = new FormData();
      formData.append("file", fs.createReadStream(pdfFilePath));
  
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
  
      return response.data;
    } catch (error) {
      console.error(`Error uploading PDF to web: ${error.message}`);
      throw new Error("Failed to upload PDF to web");
    }
  }

export { MealynAPI, MealynCDN };