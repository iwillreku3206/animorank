#!/usr/bin/env bash

ls prisma/migrations
npx zen migrate deploy
node build
