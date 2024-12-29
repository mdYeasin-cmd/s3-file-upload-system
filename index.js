import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const upload = multer({
    dest: "uploads/",
});

app.post("/upload", upload.array("files", 10), async (req, res) => {
    try {
        console.log(req.files, "all files here");

        const files = req.files;

        const fileUrls = [];

        for (const file of files) {
            const fileStream = fs.createReadStream(file.path);
            const params = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `${Date.now()}_${file.originalname}`,
                Body: fileStream,
                ContentType: file.mimetype
            };

            // upload the file to S3
            const command = new PutObjectCommand(params);
            await s3.send(command);

            // construct url
            const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

            fileUrls.push(url);

            // delete the file locally after uploading 
            fs.unlinkSync(file.path);
        }

        res.status(200).json({
            message: "Files uploaded successfully",
            urls: fileUrls,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "File upload failed",
        });
    }
});

app.get("/", (req, res) => {
    res.status(200).json({
        message: "File upload system is running...",
    });
});

app.listen(port, () => {
    console.log("Server is running at http://localhost:" + port);
});