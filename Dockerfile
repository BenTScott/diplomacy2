FROM public.ecr.aws/l7f1t7j5/golang-beta:latest as build
RUN go env -w GOPROXY=direct
# cache dependencies
ADD go.mod go.sum ./
RUN go mod download
# build
ADD . .
ARG cmd
RUN go build -o /main diplomacy/cmd/${cmd}
# copy artifacts to a clean image
FROM public.ecr.aws/lambda/provided:al2
COPY --from=build /main /main
ENTRYPOINT [ "/main" ]