;; CyberEstate - Virtual Real Estate Platform
;; A Clarinet smart contract for the Stacks blockchain

;; Define constants
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u401))
(define-constant err-not-found (err u404))
(define-constant err-not-owner (err u403))

;; Define data maps
(define-map properties uint 
  {
    owner: principal,
    name: (string-ascii 64),
    description: (string-utf8 256),
    location: (string-ascii 128),
    price: uint,
    for-sale: bool
  }
)

(define-map property-owners principal (list 100 uint))

;; Define data variables
(define-data-var next-id uint u1)

;; Helper functions
(define-private (is-owner (id uint))
  (let ((prop (map-get? properties id)))
    (if (is-some prop)
        (is-eq tx-sender (get owner (unwrap-panic prop)))
        false)
  )
)

;; Public functions
(define-public (register-property (name (string-ascii 64)) 
                                 (description (string-utf8 256))
                                 (location (string-ascii 128))
                                 (price uint))
  (let ((id (var-get next-id)))
    (map-set properties id
      {
        owner: tx-sender,
        name: name,
        description: description,
        location: location,
        price: price,
        for-sale: false
      }
    )
    
    ;; Update owner's property list
    (let ((current-props (default-to (list) (map-get? property-owners tx-sender))))
      (map-set property-owners tx-sender (append current-props id))
    )
    
    ;; Increment ID counter and return
    (var-set next-id (+ id u1))
    (ok id)
  )
)

(define-public (list-for-sale (id uint) (asking-price uint))
  (let ((property (map-get? properties id)))
    (if (is-some property)
        (if (is-owner id)
            (begin
              (map-set properties id 
                (merge (unwrap-panic property) 
                  {
                    for-sale: true,
                    price: asking-price
                  }
                )
              )
              (ok true)
            )
            err-not-owner
        )
        err-not-found
    )
  )
)

(define-public (delist (id uint))
  (let ((property (map-get? properties id)))
    (if (is-some property)
        (if (is-owner id)
            (begin
              (map-set properties id 
                (merge (unwrap-panic property) 
                  {
                    for-sale: false
                  }
                )
              )
              (ok true)
            )
            err-not-owner
        )
        err-not-found
    )
  )
)

(define-public (buy-property (id uint))
  (let ((property (map-get? properties id)))
    (if (is-some property)
        (let ((unwrapped-property (unwrap-panic property)))
          (if (get for-sale unwrapped-property)
              (if (not (is-eq tx-sender (get owner unwrapped-property)))
                  (begin
                    ;; Transfer payment
                    (try! (stx-transfer? (get price unwrapped-property) 
                                         tx-sender 
                                         (get owner unwrapped-property)))
                    
                    ;; Update seller's property list
                    (let ((seller (get owner unwrapped-property))
                          (seller-props (default-to (list) (map-get? property-owners (get owner unwrapped-property)))))
                      (map-set property-owners 
                        seller
                        (filter (lambda (prop-id) (not (is-eq prop-id id))) seller-props)
                      )
                    )
                    
                    ;; Update buyer's property list
                    (let ((buyer-props (default-to (list) (map-get? property-owners tx-sender))))
                      (map-set property-owners tx-sender (append buyer-props id))
                    )
                    
                    ;; Update property
                    (map-set properties id 
                      (merge unwrapped-property 
                        {
                          owner: tx-sender,
                          for-sale: false
                        }
                      )
                    )
                    (ok true)
                  )
                  err-not-authorized
              )
              err-not-authorized
          )
        )
        err-not-found
    )
  )
)

(define-public (update-price (id uint) (new-price uint))
  (let ((property (map-get? properties id)))
    (if (is-some property)
        (if (is-owner id)
            (begin
              (map-set properties id 
                (merge (unwrap-panic property) 
                  {
                    price: new-price
                  }
                )
              )
              (ok true)
            )
            err-not-owner
        )
        err-not-found
    )
  )
)

;; Read-only functions
(define-read-only (get-property (id uint))
  (map-get? properties id)
)

(define-read-only (get-owner-properties (owner principal))
  (map-get? property-owners owner)
)

(define-read-only (get-property-count)
  (- (var-get next-id) u1)
)