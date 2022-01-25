#!/usr/bin/env bash

echo "Found env variable: $LAMBDAS"
set -e

buildAndPush() {
  IFS='|'
  echo "Building $1"
  read cmd ecr <<< $1
  echo "Command: $cmd"
  echo "Repo: $ecr"
  docker build . --build-arg cmd=$cmd -t $ecr:$CODEBUILD_RESOLVED_SOURCE_VERSION
  docker tag $ecr:$CODEBUILD_RESOLVED_SOURCE_VERSION $ecr:latest
  docker push $ecr --all-tags
}

IFS=';'
for lambda in $LAMBDAS
do
  buildAndPush $lambda &
done

wait