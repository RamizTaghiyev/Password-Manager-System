package main

import (
	"fmt"
	"log"
	"net/http"
)

func Auth0Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		log.Println("Auth0 Middleware: Verifying request...")
		next.ServeHTTP(w, r)
	})
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Admin Dashboard: Managing users...")
}

func userHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "User View: Accessing your passwords...")
}

func main() {
	mux := http.NewServeMux()

	mux.Handle("/admin", Auth0Middleware(http.HandlerFunc(adminHandler)))
	mux.Handle("/user", Auth0Middleware(http.HandlerFunc(userHandler)))

	fmt.Println("Server starting on :8080...")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
