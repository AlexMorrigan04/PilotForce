import express, { Request, Response, NextFunction } from 'express';
import { S3 } from 'aws-sdk';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
// import { Error } from 'archiver';

// Define interfaces for request types
interface DownloadRequestBody {
  urls: string[];
  names: string[];
}

interface AuthenticatedRequest extends Request {
  s3Client: S3;
  body: DownloadRequestBody;
}

const router = express.Router();
const cognito = new CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION
});

// Middleware to check authentication
const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Create an S3 client with the user's credentials
    const s3Client = new S3({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Store the S3 client on the request object
    (req as AuthenticatedRequest).s3Client = s3Client;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

router.post('/download-images', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { urls, names } = req.body;
    
    if (!urls || !names || !Array.isArray(urls) || !Array.isArray(names)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 5 } // Compression level
    });

    // Set up response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=images.zip');

    // Handle archive errors
    archive.on('error', (err: Error) => {
      res.status(500).json({ error: 'Failed to create archive' });
    });

    // Pipe archive data to the response
    archive.pipe(res);

    // Process each image
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filename = names[i];

      try {
        // Extract the S3 key from the presigned URL
        const s3Url = new URL(url);
        const key = s3Url.pathname.substring(1); // Remove leading slash

        // Get the object from S3 using the authenticated client
        const s3Stream = req.s3Client.getObject({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key
        }).createReadStream();

        // Handle stream errors
        s3Stream.on('error', (err: Error) => {
        });

        // Create a pass-through stream to handle errors
        const passThrough = new PassThrough();
        s3Stream.pipe(passThrough);

        // Add the file to the archive
        archive.append(passThrough, { name: filename });
      } catch (error) {
        // Continue with other images even if one fails
        continue;
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    res.status(500).json({ error: 'Failed to download images' });
  }
});

// Add type definition for the extended Request
declare global {
  namespace Express {
    interface Request {
      s3Client: S3;
    }
  }
}

export default router; 