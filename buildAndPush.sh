#!/usr/bin/env bash

echo "Found env variable: $LAMBDAS"
set -e

IFS=';'
for lambda in $LAMBDAS
do
  IFS='|'
  echo "Building $lambda"
  read cmd ecr <<< $lambda
  echo "Command: $cmd"
  echo "Repo: $ecr"
  docker build . --build-arg cmd=$cmd -t $ecr:$CODEBUILD_RESOLVED_SOURCE_VERSION
  docker tag $ecr:$CODEBUILD_RESOLVED_SOURCE_VERSION $ecr:latest
  docker push $ecr --all-tags
done