#!/usr/bin/env bash

echo "Found env variable: $lambdas"
set -e

IFS=';'
for lambda in $lambdas
do
  IFS='|'
  echo "Building $lambda"
  read cmd ecr <<< $lambda
  echo "Command: $cmd"
  echo "Repo: $ecr"
  docker build . --build-arg cmd=$cmd -t $cmd:latest
  docker tag $cmd:latest $cmd:$CODEBUILD_SOURCE_VERSION
  docker push $ecr
done