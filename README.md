# apis_be_plus



## apis-nodejs

Estoy volando no puedo hacer readme quiza para incuva
## Pasos para correr en la MV
## 1. Ejecute los siguientes comandos e instale node.js v20 y AWS CLI v2
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install 20
node -v
npm -v

sudo apt install unzip
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version

## 2. Instale serverless:
sudo npm install -g serverless

## 3. Configure las credenciales de acceso a AWS
Crear el directorio /home/ubuntu/.aws
Crear el archivo credentials dentro del directorio anterior con el contenido indicado por el
docente. Nota: Estas credenciales sólo son válidas durante el Lab de AWS Academy (4 horas)
