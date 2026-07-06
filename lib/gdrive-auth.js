import fs from 'fs'
import { google } from 'googleapis'

const CREDENTIALS_PATH = './src/credentials.json'
const TOKEN_PATH = './src/token.json'

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH))
const token = JSON.parse(fs.readFileSync(TOKEN_PATH))

const { client_id, client_secret, redirect_uris } = credentials.installed

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
)

oAuth2Client.setCredentials(token)

export const drive = google.drive({
  version: 'v3',
  auth: oAuth2Client
})