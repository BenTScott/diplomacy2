#!/usr/bin/env bash

toBuild=$(echo $lambdas | tr ";" "\n")
IFS='|'

for lambda in toBuild
do
  echo "Building $lambda"
  read cmd ecr <<< $lambda
  docker build . --build-arg cmd=$cmd -t $cmd:latest
  docker tag $cmd:latest $cmd:$CODEBUILD_SOURCE_VERSION
  docker push $ecr
done