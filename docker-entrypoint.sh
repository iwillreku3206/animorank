#!/usr/bin/env bash

npm install -g @zenstackhq/cli
npx zen migrate deploy
node build
