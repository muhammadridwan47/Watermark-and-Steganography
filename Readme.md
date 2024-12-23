# Watermark and Steganography Image Service

A Node.js service to add watermark to images and embed messages using steganography.

<img width="1087" alt="Screenshot 2024-12-23 at 08 09 21" src="https://github.com/user-attachments/assets/d413c2a7-690d-44b2-aaa9-d05984678069" />


## Installation

To install the necessary dependencies, run the following command:

```sh
npm install
```

## Running the Program

To start the server, run:

```sh
node app.js
```

The server will start at `http://localhost:3000`.

## API Endpoints

### Watermark Image

- **Endpoint**: `http://localhost:3000/watermark`
- **Method**: `POST`
- **Body**:
  - `image`: File (image to which the watermark will be added)
  - `text`: String (text of the watermark to be added to the image)
- **Response**:
  ```json
  {
      "url": "http://localhost:3000/uploads/watermark/watermarked_1734878242256.png",
      "message": "Watermark telah disisipkan"
  }
  ```

### Steganography - Embed Message

- **Endpoint**: `http://localhost:3000/steganography`
- **Method**: `POST`
- **Body**:
  - `image`: File (image to embed the steganographic message into)
  - `message`: String (message to be embedded into the image)
- **Response**:
  ```json
  {
      "url": "http://localhost:3000/uploads/steganography/b94c0c4de6d9cc2fc0428386a015c973.png",
      "message": "Pesan steganografi telah disisipkan: Hallo Semua"
  }
  ```

### Steganography - Decode Message

- **Endpoint**: `http://localhost:3000/steganography/decode`
- **Method**: `POST`
- **Body**:
  - `image`: File (image from which the steganographic message will be decoded)
- **Response**:
  ```json
  {
      "message": "Decoded message: Hallo Semua"
  }
  ```
