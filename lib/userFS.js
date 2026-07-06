import fs from 'fs'
import path from 'path'

export const PUBLIC_ROOT = path.resolve('./src/public')

global.userFS = global.userFS || Object.create(null)

// Ambil path aktif user
export function getUserPath(user) {
  return global.userFS[user] || PUBLIC_ROOT
}

// Set path aktif user (SUDAH diasumsikan tervalidasi)
export function setUserPath(user, newPath) {
  global.userFS[user] = newPath
}

// Reset path ke root public
export function resetUserPath(user) {
  delete global.userFS[user]
}

// Cek apakah path masih di dalam PUBLIC_ROOT
export function isPublicPath(targetPath) {
  const relative = path.relative(PUBLIC_ROOT, targetPath)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

// Resolve input path user dengan aman
export function resolveUserPath(currentPath, input) {
  let resolved

  if (!input || input === '.') {
    resolved = currentPath
  } else {
    resolved = path.resolve(currentPath, input)
  }

  return resolved
}