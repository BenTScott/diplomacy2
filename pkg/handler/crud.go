package handler

import (
	"diplomacy/pkg/store"
	"encoding/json"
	"github.com/julienschmidt/httprouter"
	"net/http"
)

type Dependencies[T any] struct {
	Store store.Store[T]
}

func Read[T any](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		id := p.ByName("id")

		obj, err := dep.Store.Read(id)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		dat, err := json.Marshal(&obj)

		if err != nil {
			WriteError(w, err, http.StatusInternalServerError)
			return
		}

		w.Write(dat)
		w.WriteHeader(http.StatusOK)
	}
}

func Create[T any](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		decoder := json.NewDecoder(r.Body)
		val := new(T)
		err := decoder.Decode(val)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		if err := dep.Store.Create(*val); err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

func Update[T any](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		decoder := json.NewDecoder(r.Body)
		val := new(T)
		err := decoder.Decode(val)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		if err := dep.Store.Update(*val); err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

func Delete[T any](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		id := p.ByName("id")

		err := dep.Store.Delete(id)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

func WriteError(w http.ResponseWriter, err error, statusCode int) {
	w.WriteHeader(statusCode)
	w.Write([]byte(err.Error()))
	return
}
