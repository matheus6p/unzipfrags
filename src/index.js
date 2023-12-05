import {
  createReadStream,
  readdirSync,
  statSync,
  unlinkSync,
  renameSync,
  rmdirSync,
  createWriteStream,
} from "fs";
import { join, dirname, extname, basename } from "path";
import { Extract } from "unzipper";
import archiver from "archiver";

const entryFolder = join(
  dirname(new URL("./files", import.meta.url).pathname),
  "files"
);

console.log(entryFolder);

async function unzipFile(filePath) {
  const zipFileName = basename(filePath, ".zip");
  const unzipFolder = join(dirname(filePath), zipFileName);

  await createReadStream(filePath)
    .pipe(Extract({ path: unzipFolder }))
    .promise();

  return unzipFolder;
}

function verifyContent(folder) {
  const content = readdirSync(folder);

  const folders = content.filter((item) =>
    statSync(join(folder, item)).isDirectory()
  );
  const files = content.filter((item) => statSync(join(folder, item)).isFile());

  return { folders, files };
}

function deleteFile(filePath) {
  unlinkSync(filePath);
}

async function main() {
  try {
    const zipFiles = readdirSync(entryFolder).filter((file) =>
      file.toLowerCase().endsWith(".zip")
    );
    if (zipFiles.length === 0) {
      console.log("Nenhum arquivo ZIP encontrado.");
      return;
    }

    zipFiles.forEach(async (zipFile) => {
      const filePath = join(entryFolder, zipFile);
      const unzippedFolder = await unzipFile(filePath);
      const content = verifyContent(unzippedFolder);

      if (content.folders.length > 0) {
        const subFolder = join(unzippedFolder, content.folders[0]);
        const subFolderContent = verifyContent(subFolder);

        const imageFile = subFolderContent.files.find((file) =>
          [".png", ".jpg", ".jpeg"].includes(extname(file).toLowerCase())
        );

        if (imageFile) {
          deleteFile(join(subFolder, imageFile));
        } else {
          subFolderContent.files.forEach((file) => {
            renameSync(join(subFolder, file), join(unzippedFolder, file));
          });

          rmdirSync(subFolder);
        }
      } else if (content.files.length > 0) {
        const imageFile = content.files.find((file) =>
          [".png", ".jpg", ".jpeg"].includes(extname(file).toLowerCase())
        );
        if (imageFile) {
          deleteFile(join(unzippedFolder, imageFile));
        } else {
          console.log("Nenhum arquivo encontrado");
        }
      } else {
        console.log("A pasta está vazia.");
      }
      const outputZipPath = join(
        entryFolder,
        zipFile,
      );
      const outputZipStream = createWriteStream(outputZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(outputZipStream);
      archive.directory(unzippedFolder, false);
      archive.finalize();

      outputZipStream.on("close", () => {
        console.log(archive.pointer() + " bytes totais");
        console.log("Pasta compactada com sucesso.");

        rmdirSync(unzippedFolder, { recursive: true });
      });

      outputZipStream.on("error", (err) => {
        throw err;
      });
    });
  } catch (error) {
    console.error("Algo deu errado:", error);
  }
}

main();
